require('dotenv').config();
const { getWeb3, walletAddress, switchRpc } = require('./config/web3');
const { lendAmount } = require('./src/module/minterest/lend');
const { redeem } = require('./src/module/minterest/redeem');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
}

function randomWaitTime() {
    // Return a random time between 5 and 15 minutes in milliseconds
    return Math.random() * (900000 - 300000) + 300000;
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
    let web3Instance = getWeb3();
    const minTransactionsPerDay = 130;
    const maxTransactionsPerDay = 145;
    let transactionsToday = 0;

    while (transactionsToday < maxTransactionsPerDay) {
        // Check if it's a new UTC day
        const currentDate = new Date();
        const currentDay = currentDate.getUTCDate();

        // Execute wrap, unwrap, lend, or redeem action randomly
        const actions = [wrap, unwrap, lendAmount, redeem];
        const randomActionIndex = Math.floor(Math.random() * actions.length);
        const action = actions[randomActionIndex];

        const gasPriceWei = randomGasPrice(web3Instance);
        const gasLimit = new BN(500000); 
        const totalTxCost = gasLimit.mul(gasPriceWei);

        console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
        console.log(`Total Tx Cost: ${web3Instance.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

        let txHash;
        let txLink;

        if (action === lendAmount) {
            // Lend
            const lendRangeMin = 1.0;
            const lendRangeMax = 2.0;
            let amount = Math.random() * (lendRangeMax - lendRangeMin) + lendRangeMin;
            amount = Math.floor(amount * 1_000_000);
            txHash = await executeTransaction(action, gasPriceWei, amount);
            if (!txHash) break;
            txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`Lend Transaction sent: ${txLink}, \nAmount: ${amount / 1_000_000} USDC \nGwei: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
        } else if (action === redeem) {
            // Redeem
            txHash = await executeTransaction(action, gasPriceWei);
            if (!txHash) break;
            console.log(`Redeem Transaction sent: ${txHash}`);
        } else {
            // Wrap or Unwrap
            const amountMin = 0.0003;
            const amountMax = 0.0004;
            let amount = Math.random() * (amountMax - amountMin) + amountMin;
            amount = parseFloat(amount.toFixed(6));

            txHash = await executeTransaction(action, gasPriceWei, amount);
            if (!txHash) break;

            txLink = `https://taikoscan.io/tx/${txHash}`;
            console.log(`${action.name} Transaction sent: ${txLink}, \nAmount: ${amount} ETH`);
        }

        transactionsToday++;
        console.log(`Transaction ${transactionsToday}/${maxTransactionsPerDay} sent.`);

        // Wait for a random time between transactions (e.g., 5 to 15 minutes)
        const waitTime = randomWaitTime();
        console.log(`Waiting for ${waitTime / 1000} seconds before next transaction...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    console.log(`Completed ${transactionsToday} transactions for today.`);
}

main().catch(console.error);
