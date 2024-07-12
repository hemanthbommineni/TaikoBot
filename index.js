require('dotenv').config();
const { getWeb3, walletAddress, switchRpc } = require('./config/web3');
// const { lendAmount } = require('./src/module/minterest/lend');
// const { redeem } = require('./src/module/minterest/redeem');
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
    let web3Instance = getWeb3();
    const maxTransactionsPerDay = 145;
    let transactionsToday = 0;

    while (true) {
        // Check if we've reached the maximum transactions for today
        if (transactionsToday >= maxTransactionsPerDay) {
            console.log(`Reached maximum transactions (${maxTransactionsPerDay}) for today. Exiting.`);
            break;
        }

        // Check if it's a new UTC day
        const currentDate = new Date();
        const currentDay = currentDate.getUTCDate();

        // Execute wrap action
        const gasPriceWei = randomGasPrice(web3Instance);
        const gasLimit = new BN(500000); 
        const totalTxCost = gasLimit.mul(gasPriceWei);

        console.log(`Gas Limit: ${gasLimit.toString()}, Gas Price: ${web3Instance.utils.fromWei(gasPriceWei, 'gwei')} Gwei`);
        console.log(`Total Tx Cost: ${web3Instance.utils.fromWei(totalTxCost.toString(), 'ether')} ETH`);

        const wrapAmountMin = 0.0003;
        const wrapAmountMax = 0.0004;
        let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
        wrapAmount = parseFloat(wrapAmount.toFixed(6));
        let txHash = await executeTransaction(wrap, gasPriceWei, wrapAmount);
        if (!txHash) break;
        let txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Wrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

        transactionsToday++;

        // Wait for a random time between transactions (e.g., 5 minutes)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300000));

        // Check if we've reached the maximum transactions for today after wrap
        if (transactionsToday >= maxTransactionsPerDay) {
            console.log(`Reached maximum transactions (${maxTransactionsPerDay}) for today. Exiting.`);
            break;
        }

        // Execute unwrap action
        const unwrapAmountMin = 0.0003;
        const unwrapAmountMax = 0.0004;
        let unwrapAmount = Math.random() * (unwrapAmountMax - unwrapAmountMin) + unwrapAmountMin;
        unwrapAmount = parseFloat(unwrapAmount.toFixed(6));
        txHash = await executeTransaction(unwrap, gasPriceWei, unwrapAmount);
        if (!txHash) break;
        txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Unwrap Transaction sent: ${txLink}, \nAmount: ${unwrapAmount} ETH`);

        transactionsToday++;

        // Wait for a random time between transactions (e.g., 5 minutes)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300000));
    }

    console.log(`Completed transactions for today.`);
}

main().catch(console.error);
