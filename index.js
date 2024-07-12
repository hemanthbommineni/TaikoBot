require('dotenv').config();
const { getWeb3, switchRpc } = require('./config/web3');
const { lendAmount } = require('./src/module/minterest/lend');
const { redeem } = require('./src/module/minterest/redeem');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

// Add your wallet details here
const wallets = [
    { address: 'WALLET_ADDRESS_1', privateKey: 'PRIVATE_KEY_1' },
    { address: 'WALLET_ADDRESS_2', privateKey: 'PRIVATE_KEY_2' },
    // Add more wallets as needed
];

const MAX_TRANSACTIONS_PER_DAY = 145;
let transactionCount = 0;
let currentDay = new Date().getUTCDate();

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
}

function randomIterations() {
    return Math.random() < 0.5 ? 7 : 8; 
}

async function getNonce(web3Instance, address) {
    return await web3Instance.eth.getTransactionCount(address, 'pending');
}

async function executeTransaction(web3Instance, action, wallet, gasPriceWei, ...args) {
    while (true) {
        try {
            const gasLimit = new BN(100000);
            const totalTxCost = gasLimit.mul(new BN(gasPriceWei));
            const balanceWei = await web3Instance.eth.getBalance(wallet.address);
            const balance = new BN(balanceWei);

            if (balance.lt(totalTxCost)) {
                console.log("Insufficient funds to cover the transaction cost. Transaction skipped.");
                return;
            }

            const localNonce = await getNonce(web3Instance, wallet.address);
            const txHash = await action(web3Instance, wallet, ...args, gasPriceWei.toString(), localNonce.toString());
            transactionCount++;
            return txHash;
        } catch (error) {
            console.error(`Error executing transaction: ${error.message}`);
            if (error.message.includes("Invalid JSON RPC response")) {
                console.log("Retrying...");
                web3Instance = switchRpc(); 
            } else if (error.message.includes("nonce too low")) {
                console.log("Nonce too low, retrying with new nonce...");
            } else if (error.message.includes("Transaction has been reverted by the EVM")) {
                console.error("Transaction reverted by the EVM. Skipping to the next transaction.");
                return;
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000)); 
            }
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
    return Math.random() * (300000 - 60000) + 60000; // Random delay between 1 to 5 minutes
}

function resetTransactionCountIfNewDay() {
    const today = new Date().getUTCDate();
    if (currentDay !== today) {
        transactionCount = 0;
        currentDay = today;
    }
}

async function executeActionsForWallet(wallet) {
    let web3Instance = getWeb3(wallet.privateKey);
    const lendRangeMin = 1.0;
    const lendRangeMax = 2.0;
    const maxIterations = randomIterations();
    let iterationCount = 0;

    while (iterationCount < maxIterations) {
        resetTransactionCountIfNewDay();

        if (transactionCount >= MAX_TRANSACTIONS_PER_DAY) {
            console.log("Transaction limit reached for the day. Exiting.");
            return;
        }

        const gasPriceWei = randomGasPrice(web3Instance);

        const balanceWei = await web3Instance.eth.getBalance(wallet.address);
        const balance = new BN(balanceWei);
        const gasLimit = new BN(500000); 
        const totalTxCost = gasLimit.mul(gasPriceWei);

        console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
        console.log(`Total Tx Cost: ${web3Instance.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

        if (balance.lt(totalTxCost)) {
            console.log("Insufficient funds to cover the transaction cost. Transaction skipped.");
            break;
        }

        /*
        // Lend
        let amount = Math.random() * (lendRangeMax - lendRangeMin) + lendRangeMin;
        amount = Math.floor(amount * 1_000_000);
        let txHash = await executeTransaction(web3Instance, lendAmount, wallet, gasPriceWei, amount.toString());
        if (!txHash) break;
        let txLink = `https://taikoscan.io/tx/${txHash}`;
        let amountDecimal = amount / 1_000_000;
        console.log(`Lend Transaction sent: ${txLink}, \nAmount: ${amountDecimal} USDC \nGwei: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);

        await delay(randomDelay());

        resetTransactionCountIfNewDay();

        if (transactionCount >= MAX_TRANSACTIONS_PER_DAY) {
            console.log("Transaction limit reached for the day. Exiting.");
            return;
        }

        // Redeem
        txHash = await executeTransaction(web3Instance, redeem, wallet, gasPriceWei);
        if (!txHash) break;

        await delay(randomDelay());

        resetTransactionCountIfNewDay();

        if (transactionCount >= MAX_TRANSACTIONS_PER_DAY) {
            console.log("Transaction limit reached for the day. Exiting.");
            return;
        }
        */

        // Wrap
        const wrapAmountMin = 0.0003;
        const wrapAmountMax = 0.0004;
        let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
        wrapAmount = parseFloat(wrapAmount.toFixed(6));
        let txHash = await executeTransaction(web3Instance, wrap, wallet, gasPriceWei, wrapAmount.toString());
        if (!txHash) break;
        let txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Wrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

        await delay(randomDelay());

        resetTransactionCountIfNewDay();

        if (transactionCount >= MAX_TRANSACTIONS_PER_DAY) {
            console.log("Transaction limit reached for the day. Exiting.");
            return;
        }

        // Unwrap
        txHash = await executeTransaction(web3Instance, unwrap, wallet, gasPriceWei, wrapAmount.toString());
        if (!txHash) break;
        txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Unwrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

        iterationCount++;
    }

    console.log(`Completed ${maxIterations} iterations for wallet ${wallet.address}.`);
}

async function main() {
    while (transactionCount < MAX_TRANSACTIONS_PER_DAY) {
        for (const wallet of wallets) {
            resetTransactionCountIfNewDay();
            if (transactionCount >= MAX_TRANSACTIONS_PER_DAY) {
                break;
            }
            await executeActionsForWallet(wallet);
            await delay(randomDelay());
        }
    }

    console.log("Completed actions for all wallets.");
}

main().catch(console.error);
