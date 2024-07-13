require('dotenv').config();
const { getWeb3, switchRpc, wallets } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
}

function randomIterations() {
    return Math.random() < 0.5 ? 7 : 8; 
}

async function getNonce(web3Instance) {
    return await web3Instance.eth.getTransactionCount(walletAddress, 'pending');
}

async function executeTransaction(action, gasPriceWei, ...args) {
    let web3Instance = getWeb3();
    while (true) {
        try {
            const gasLimit = new BN(100000);
            const totalTxCost = gasLimit.mul(new BN(gasPriceWei));
            const balanceWei = await web3Instance.eth.getBalance(walletAddress);
            const balance = new BN(balanceWei);

            if (balance.lt(totalTxCost)) {
                console.log("Insufficient funds to cover the transaction cost. Transaction skipped.");
                return;
            }

            const localNonce = await getNonce(web3Instance);
            return await action(...args, gasPriceWei.toString(), localNonce);
        } catch (error) {
            console.error(`Error executing transaction: ${error.message}`);
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
    const wrapAmountMin = 0.0003;
    const wrapAmountMax = 0.0004;
    const maxTransactionsPerDay = Math.floor(Math.random() * (145 - 130 + 1)) + 130; // Random daily transaction limit

    let totalTransactions = 0;
    let currentDate = new Date().getUTCDate(); // UTC date to track daily transactions

    while (totalTransactions < maxTransactionsPerDay) {
        // Iterate through each wallet and perform transactions
        for (let i = 0; i < wallets.length; i++) {
            const { web3, privateKey } = wallets[i];
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            const walletAddress = account.address;

            const gasPriceWei = randomGasPrice(web3);

            const balanceWei = await web3.eth.getBalance(walletAddress);
            const balance = new BN(balanceWei);
            const gasLimit = new BN(500000); 
            const totalTxCost = gasLimit.mul(gasPriceWei);

            console.log(`Wallet Address: ${walletAddress}`);
            console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
            console.log(`Total Tx Cost: ${web3.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

            if (balance.lt(totalTxCost)) {
                console.log("Insufficient funds to cover the transaction cost. Transaction skipped.");
                continue;
            }

            // Wrap (Example transaction)
            let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
            wrapAmount = parseFloat(wrapAmount.toFixed(6));
            let txHash = await executeTransaction(wrap, gasPriceWei, wrapAmount);
            if (!txHash) continue;
            let txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Wrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

            // Unwrap (Example transaction)
            txHash = await executeTransaction(unwrap, gasPriceWei, wrapAmount);
            if (!txHash) continue;
            txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Unwrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

            totalTransactions++;

            // Random wait time between transactions
            const waitTime = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // Random wait between 5 to 10 seconds
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        }

        // Check if date has changed (UTC date)
        if (new Date().getUTCDate() !== currentDate) {
            totalTransactions = 0; // Reset daily transaction count if date changes
            currentDate = new Date().getUTCDate();
        }
    }

    console.log(`Reached daily transaction limit (${maxTransactionsPerDay}). Exiting...`);
}

main().catch(console.error);
