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

async function getNonce(web3Instance, walletAddress) {
    return await web3Instance.eth.getTransactionCount(walletAddress, 'pending');
}

async function executeTransaction(action, gasPriceWei, walletAddress, privateKey, ...args) {
    let web3Instance = getWeb3();
    let account = web3Instance.eth.accounts.privateKeyToAccount(privateKey);
    web3Instance.eth.accounts.wallet.add(account);
    web3Instance.eth.defaultAccount = account.address;

    while (true) {
        try {
            const gasLimit = new BN(100000);
            const totalTxCost = gasLimit.mul(new BN(gasPriceWei));
            const balanceWei = await web3Instance.eth.getBalance(walletAddress);
            const balance = new BN(balanceWei);

            if (balance.lt(totalTxCost)) {
                console.log(`Wallet ${walletAddress}: Insufficient funds to cover the transaction cost. Transaction skipped.`);
                return;
            }

            const localNonce = await getNonce(web3Instance, walletAddress);
            const nonce = new BN(localNonce);

            return await action(...args, gasPriceWei.toString(), nonce.toString());
        } catch (error) {
            console.error(`Wallet ${walletAddress}: Error executing transaction: ${error.message}`);
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
    let web3Instance = getWeb3();
    const maxIterations = 145; // Limit to 145 transactions per day
    let transactionCount = 0;

    while (transactionCount < maxIterations) {
        for (let i = 0; i < wallets.length; i++) {
            const gasPriceWei = randomGasPrice(web3Instance);
            const wallet = wallets[i];
            const walletAddress = wallet.address;
            const privateKey = wallet.privateKey;

            // Wrap
            const wrapAmountMin = 0.0003;
            const wrapAmountMax = 0.0004;
            let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
            wrapAmount = parseFloat(wrapAmount.toFixed(6));
            let txHash = await executeTransaction(wrap, gasPriceWei, walletAddress, privateKey, wrapAmount);
            if (!txHash) break;
            let txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Wallet ${walletAddress}: Wrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

            // Unwrap
            txHash = await executeTransaction(unwrap, gasPriceWei, walletAddress, privateKey, wrapAmount);
            if (!txHash) break;
            txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Wallet ${walletAddress}: Unwrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

            transactionCount++;
            if (transactionCount >= maxIterations) break;
        }
    }

    console.log(`Completed ${transactionCount} transactions.`);
}

main().catch(console.error);
