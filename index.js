const fs = require('fs');
const path = require('path');
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

const TRACKER_FOLDER = path.join(__dirname, 'Taikobot', 'tracker');

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
                return false;
            }

            const localNonce = await getNonce(web3Instance, wallet.address);
            const txHash = await action(...args, gasPriceWei.toString(), localNonce, wallet.address, wallet.privateKey);

            if (txHash) {
                console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Transaction sent. Waiting for confirmation...`);

                // Wait for transaction confirmation (adjust as per your requirement)
                const receipt = await web3Instance.eth.getTransactionReceipt(txHash);
                if (receipt && receipt.status) {
                    console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Transaction successful. TxHash: ${txHash}`);
                    return txHash;
                } else {
                    console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Transaction failed. TxHash: ${txHash}`);
                    return false;
                }
            } else {
                console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Transaction failed to send.`);
                return false;
            }
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

    // Wait before starting transactions to stagger wallet activity
    await waitBeforeStart(walletIndex);

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
            const wrapAmountMax = 0.0004;
            let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
            wrapAmount = parseFloat(wrapAmount.toFixed(6));
            let txHash = await executeTransaction(wrap, gasPriceWei, wallet, walletIndex, iterationCount, wrapAmount);
            if (!txHash) break;
            let txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Wrap Transaction sent: ${txLink}, Amount: ${wrapAmount} ETH`);

            // Random delay before Unwrap (0 to 5 minutes)
            const randomDelay = Math.floor(Math.random() * 300000); // Random delay up to 5 minutes
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting ${randomDelay / 1000} seconds before Unwrap.`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));

            // Unwrap
            txHash = await executeTransaction(unwrap, gasPriceWei, wallet, walletIndex, iterationCount, wrapAmount);
            if (!txHash) break;

            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Unwrap Transaction sent: https://taikoscan.io/tx/${txHash}`);
        } else {
            console.log(`Wallet ${walletIndex + 1}: Transactions skipped during the UTC hour ${currentHourUTC}.`);
        }

        iterationCount++;

        const waitTime = Math.floor(3600 / transactionsPerHour * 1000); // Calculate wait time in milliseconds for even distribution
        console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting for ${waitTime / 1000} seconds before the next transaction.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

async function waitBeforeStart(walletIndex) {
    const initialDelay = Math.floor(Math.random() * 3600000); // Random delay up to 1 hour
    console.log(`Wallet ${walletIndex + 1}: Initial delay of ${initialDelay / 1000} seconds before starting transactions.`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));
}

function updateTransactionCount(walletIndex, count) {
    const trackerFilePath = path.join(TRACKER_FOLDER, `wallet_${walletIndex + 1}_tracker.json`);

    try {
        let trackerData = {};
        if (fs.existsSync(trackerFilePath)) {
            trackerData = JSON.parse(fs.readFileSync(trackerFilePath));
        }

        trackerData.transactionCount = count;

        fs.writeFileSync(trackerFilePath, JSON.stringify(trackerData, null, 2));
        console.log(`Wallet ${walletIndex + 1}: Transaction count updated to ${count}.`);
    } catch (err) {
        console.error(`Error updating transaction count for Wallet ${walletIndex + 1}: ${err.message}`);
    }
}

function readTransactionCount(walletIndex) {
    const trackerFilePath = path.join(TRACKER_FOLDER, `wallet_${walletIndex + 1}_tracker.json`);

    try {
        if (fs.existsSync(trackerFilePath)) {
            const trackerData = JSON.parse(fs.readFileSync(trackerFilePath));
            return trackerData.transactionCount || 0;
        }
    } catch (err) {
        console.error(`Error reading transaction count for Wallet ${walletIndex + 1}: ${err.message}`);
    }

    return 0;
}

function readDailyTransactionCount(walletIndex) {
    const trackerFilePath = path.join(TRACKER_FOLDER, `wallet_${walletIndex + 1}_tracker.json`);

    try {
        if (fs.existsSync(trackerFilePath)) {
            const trackerData = JSON.parse(fs.readFileSync(trackerFilePath));
            return trackerData.dailyTransactionCount || {};
        }
    } catch (err) {
        console.error(`Error reading daily transaction count for Wallet ${walletIndex + 1}: ${err.message}`);
    }

    return {};
}

async function main() {
    for (let i = 0; i < wallets.length; i++) {
        console.log(`Starting transactions for Wallet ${i + 1}`);
        await runTransactionsForWallet(wallets[i], i);
        console.log(`Transactions for Wallet ${i + 1} completed.`);
    }
}

main().catch(err => console.error(`Error in main execution: ${err.message}`));
