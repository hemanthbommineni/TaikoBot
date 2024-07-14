const fs = require('fs');
const { getWeb3, switchRpc } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

require('dotenv').config();

const wallets = [
    {
        address: process.env.WALLET_ADDRESS_1,
        privateKey: process.env.PRIVATE_KEY_1
    },
    {
        address: process.env.WALLET_ADDRESS_2,
        privateKey: process.env.PRIVATE_KEY_2
    },
    {
        address: process.env.WALLET_ADDRESS_3,
        privateKey: process.env.PRIVATE_KEY_3
    },
    {
        address: process.env.WALLET_ADDRESS_4,
        privateKey: process.env.PRIVATE_KEY_4
    },
    {
        address: process.env.WALLET_ADDRESS_5,
        privateKey: process.env.PRIVATE_KEY_5
    },
    {
        address: process.env.WALLET_ADDRESS_6,
        privateKey: process.env.PRIVATE_KEY_6
    },
    {
        address: process.env.WALLET_ADDRESS_7,
        privateKey: process.env.PRIVATE_KEY_7
    },
    {
        address: process.env.WALLET_ADDRESS_8,
        privateKey: process.env.PRIVATE_KEY_8
    },
    {
        address: process.env.WALLET_ADDRESS_9,
        privateKey: process.env.PRIVATE_KEY_9
    },
    {
        address: process.env.WALLET_ADDRESS_10,
        privateKey: process.env.PRIVATE_KEY_10
    },
    {
        address: process.env.WALLET_ADDRESS_11,
        privateKey: process.env.PRIVATE_KEY_11
    },
    {
        address: process.env.WALLET_ADDRESS_12,
        privateKey: process.env.PRIVATE_KEY_12
    },
    {
        address: process.env.WALLET_ADDRESS_13,
        privateKey: process.env.PRIVATE_KEY_13
    }
    
];                                                                                                                                          


const MAX_TRANSACTIONS_PER_DAY = 145;
const MAX_TRANSACTIONS_PER_HOUR = 8; // Adjust as needed

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
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

async function runTransactionsForWallet(wallet, walletIndex) {
    let iterationCount = readTransactionCount(walletIndex);
    let dailyTransactionCount = readDailyTransactionCount(walletIndex);

    const transactionsPerDay = Math.floor(Math.random() * 11) + 130; // Random number between 130 and 140
    const transactionsPerHour = Math.floor(transactionsPerDay / 20); // Spread transactions over 20 hours

    // Generate a random start hour for the 4-hour pause window (UTC hour 0-19)
    const pauseStartHour = Math.floor(Math.random() * 20);

    while (iterationCount < MAX_TRANSACTIONS_PER_DAY) {
        const currentDate = new Date().toISOString().slice(0, 10); // Get current UTC date (YYYY-MM-DD)
        dailyTransactionCount = dailyTransactionCount[currentDate] ? dailyTransactionCount[currentDate].transactionCount || 0 : 0;

        if (dailyTransactionCount >= MAX_TRANSACTIONS_PER_DAY) {
            console.log(`Wallet ${walletIndex + 1}: Already reached maximum transactions (${MAX_TRANSACTIONS_PER_DAY}) for today (${currentDate}). Skipping further transactions.`);
            break;
        }

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

            console.log(`UTC Date and Time: ${new Date().toISOString()}`);
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}:`);
            console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
            console.log(`Total Tx Cost: ${web3Instance.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

            if (balance.lt(totalTxCost)) {
                console.log(`Wallet ${walletIndex + 1}: Insufficient funds to cover the transaction cost. Transaction skipped.`);
                break;
            }

            // Wrap
            const wrapAmountMin = 0.0003;
            const w
