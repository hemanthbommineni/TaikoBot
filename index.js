require('dotenv').config();
const { getWeb3, switchRpc } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

const wallets = [
    {
        address: process.env.WALLET_ADDRESS_1,
        privateKey: process.env.PRIVATE_KEY_1
    },
    {
        address: process.env.WALLET_ADDRESS_2,
        privateKey: process.env.PRIVATE_KEY_2
    }
    // Add more wallets as needed
];

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
}

function randomIterations() {
    return Math.floor(Math.random() * 16) + 130; // Random number between 130 and 145
}

async function getNonce(web3Instance, walletAddress) {
    return await web3Instance.eth.getTransactionCount(walletAddress, 'pending');
}

async function executeTransaction(action, gasPriceWei, wallet, walletIndex, iterationCount, ...args) {
    let web3Instance = getWeb3();
    while (true) {
        try {
            const gasLimit = new BN(100000);
            const totalTxCost = gasLimit.mul(new BN(gasPriceWei));
            const balanceWei = await web3Instance.eth.getBalance(wallet.address);
            const balance = new BN(balanceWei);

            if (balance.lt(totalTxCost)) {
                console.log(`Wallet ${walletIndex + 1}: Insufficient funds to cover the transaction cost. Transaction skipped.`);
                return;
            }

            const localNonce = await getNonce(web3Instance, wallet.address);
            return await action(...args, gasPriceWei.toString(), localNonce, wallet.address, wallet.privateKey);
        } catch (error) {
            console.error(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Error executing transaction: ${error.message}`);
            if (error.message.includes("Invalid JSON RPC response")) {
                console.log("Retrying...");
                web3Instance = switchRpc(); 
            } else if (error.message.includes("nonce too low")) {
                console.log("Nonce too low, retrying with new nonce...");
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000)); 
            }
        }
    }
}

async function main() {
    const maxIterations = randomIterations();
    let iterationCount = 0;

    while (iterationCount < maxIterations) {
        const walletIndex = Math.floor(Math.random() * wallets.length);
        const wallet = wallets[walletIndex];
        const web3Instance = getWeb3();
        const gasPriceWei = randomGasPrice(web3Instance);

        const balanceWei = await web3Instance.eth.getBalance(wallet.address);
        const balance = new BN(balanceWei);
        const gasLimit = new BN(500000); 
        const totalTxCost = gasLimit.mul(gasPriceWei);

        console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}:`);
        console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
        console.log(`Total Tx Cost: ${web3Instance.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

        if (balance.lt(totalTxCost)) {
            console.log(`Wallet ${walletIndex + 1}: Insufficient funds to cover the transaction cost. Transaction skipped.`);
            break;
        }

        // Wrap
        const wrapAmountMin = 0.0003;
        const wrapAmountMax = 0.0004;
        let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
        wrapAmount = parseFloat(wrapAmount.toFixed(6));
        let txHash = await executeTransaction(wrap, gasPriceWei, wallet, walletIndex, iterationCount, wrapAmount);
        if (!txHash) break;
        let txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Wrap Transaction sent: ${txLink}, Amount: ${wrapAmount} ETH`);

        // Unwrap
        txHash = await executeTransaction(unwrap, gasPriceWei, wallet, walletIndex, iterationCount, wrapAmount);
        if (!txHash) break;

        console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Unwrap Transaction sent: https://taikoscan.io/tx/${txHash}`);

        iterationCount++;
        const waitTime = Math.floor(Math.random() * (24 * 60 * 60 * 1000 / maxIterations)); // Random wait time within the day
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

main();
