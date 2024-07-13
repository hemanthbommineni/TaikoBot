require('dotenv').config();
const { getWeb3, switchRpc } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const { lend } = require('./src/module/minterest/lend');
const { redeem } = require('./src/module/minterest/redeem');
const BN = require('bn.js');

const wallets = [
    { 
        address: process.env.WALLET_ADDRESS_1,
        privateKey: process.env.PRIVATE_KEY_1
    }
];

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
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

async function runTransactionsForWallet(wallet, walletIndex) {
    const transactionsPerDay = Math.floor(Math.random() * 11) + 130; // Random number between 130 and 140
    const transactionsPerHour = Math.floor(transactionsPerDay / 20); // Spread transactions over 20 hours

    let iterationCount = 0;

    // Generate a random start hour for the 4-hour pause window (UTC hour 0-19)
    const pauseStartHour = Math.floor(Math.random() * 20);

    while (iterationCount < transactionsPerDay) {
        const currentHourUTC = new Date().getUTCHours();

        // Check if current hour is within the 4-hour pause window
        const isWithinPauseWindow = currentHourUTC >= pauseStartHour && currentHourUTC < (pauseStartHour + 4) % 24;

        if (!isWithinPauseWindow) {
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

            // Short delay before Unwrap (30 seconds)
            const shortDelay = 30000; // 30 seconds
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting ${shortDelay / 1000} seconds before Unwrap.`);
            await new Promise(resolve => setTimeout(resolve, shortDelay));

            // Unwrap
            txHash = await executeTransaction(unwrap, gasPriceWei, wallet, walletIndex, iterationCount, wrapAmount);
            if (!txHash) break;
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Unwrap Transaction sent: https://taikoscan.io/tx/${txHash}`);

            // Short delay before Lend (30 seconds)
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting ${shortDelay / 1000} seconds before Lend.`);
            await new Promise(resolve => setTimeout(resolve, shortDelay));

            // Lend
            const lendAmountMin = 0.0001;
            const lendAmountMax = 0.0002;
            let lendAmount = Math.random() * (lendAmountMax - lendAmountMin) + lendAmountMin;
            lendAmount = parseFloat(lendAmount.toFixed(6));
            txHash = await executeTransaction(lend, gasPriceWei, wallet, walletIndex, iterationCount, lendAmount);
            if (!txHash) break;
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Lend Transaction sent: https://taikoscan.io/tx/${txHash}, Amount: ${lendAmount} USDC`);

            // Short delay before Redeem (30 seconds)
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting ${shortDelay / 1000} seconds before Redeem.`);
            await new Promise(resolve => setTimeout(resolve, shortDelay));

            // Redeem
            txHash = await executeTransaction(redeem, gasPriceWei, wallet, walletIndex, iterationCount);
            if (!txHash) break;
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Redeem Transaction sent: https://taikoscan.io/tx/${txHash}`);
        } else {
            console.log(`Wallet ${walletIndex + 1}: Transactions skipped during the UTC hour ${currentHourUTC}.`);
        }

        iterationCount++;
        const waitTime = 30000; // 30 seconds between transactions
        console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting for ${waitTime / 1000} seconds before the next transaction.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

async function main() {
    const walletPromises = wallets.map((wallet, index) => {
        const initialDelay = 30000; // 30 seconds initial delay
        console.log(`Wallet ${index + 1}: Initial delay of ${initialDelay / 1000} seconds before starting transactions.`);
        return new Promise(resolve => setTimeout(() => resolve(runTransactionsForWallet(wallet, index)), initialDelay));
    });
    await Promise.all(walletPromises);
}

main().catch(console.error);
