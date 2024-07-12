require('dotenv').config();
const { getWeb3, switchRpc } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const BN = require('bn.js');

// Function to retrieve wallet details from .env file
function getWalletDetails(walletIndex) {
    const walletAddress = process.env[`WALLET_${walletIndex}_ADDRESS`];
    const privateKey = process.env[`WALLET_${walletIndex}_PRIVATE_KEY`];
    return { walletAddress, privateKey };
}

// Function to execute transactions for a given wallet
async function executeTransaction(web3Instance, action, gasPriceWei, walletAddress, ...args) {
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

            const localNonce = await web3Instance.eth.getTransactionCount(walletAddress, 'pending');
            return await action(...args, gasPriceWei.toString(), localNonce);
        } catch (error) {
            console.error(`Wallet ${walletAddress}: Error executing transaction: ${error.message}`);
            if (error.message.includes("Invalid JSON RPC response")) {
                console.log("Retrying...");
                web3Instance = switchRpc(); 
            } else if (error.message.includes("nonce too low")) {
                console.log(`Wallet ${walletAddress}: Nonce too low, retrying with new nonce...`);
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000)); 
            }
        }
    }
}

// Main function to execute transactions for all wallets
async function main() {
    const maxTransactionsPerDay = 145;
    let transactionsToday = 0;
    let walletIndex = 1;

    while (true) {
        const { walletAddress, privateKey } = getWalletDetails(walletIndex);
        if (!walletAddress || !privateKey) {
            console.log(`No wallet details found for index ${walletIndex}. Exiting.`);
            break;
        }

        let web3Instance = getWeb3(privateKey);

        // Execute transactions for the current wallet
        const gasPriceWei = randomGasPrice(web3Instance);
        const gasLimit = new BN(500000); 
        const totalTxCost = gasLimit.mul(gasPriceWei);

        // Execute wrap action for current wallet
        const wrapAmountMin = 0.0003;
        const wrapAmountMax = 0.0004;
        let wrapAmount = Math.random() * (wrapAmountMax - wrapAmountMin) + wrapAmountMin;
        wrapAmount = parseFloat(wrapAmount.toFixed(6));
        let txHash = await executeTransaction(web3Instance, wrap, gasPriceWei, walletAddress, wrapAmount);
        if (!txHash) break;
        let txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Wallet ${walletAddress}: Wrap Transaction sent: ${txLink}, \nAmount: ${wrapAmount} ETH`);

        transactionsToday++;

        // Wait for a random time between transactions (e.g., 5 minutes)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300000));

        // Check if we've reached the maximum transactions for today after wrap
        if (transactionsToday >= maxTransactionsPerDay) {
            console.log(`Wallet ${walletAddress}: Reached maximum transactions (${maxTransactionsPerDay}) for today. Exiting.`);
            break;
        }

        // Execute unwrap action for current wallet
        const unwrapAmountMin = 0.0003;
        const unwrapAmountMax = 0.0004;
        let unwrapAmount = Math.random() * (unwrapAmountMax - unwrapAmountMin) + unwrapAmountMin;
        unwrapAmount = parseFloat(unwrapAmount.toFixed(6));
        txHash = await executeTransaction(web3Instance, unwrap, gasPriceWei, walletAddress, unwrapAmount);
        if (!txHash) break;
        txLink = `https://taikoscan.io/tx/${txHash}`;
        console.log(`Wallet ${walletAddress}: Unwrap Transaction sent: ${txLink}, \nAmount: ${unwrapAmount} ETH`);

        transactionsToday++;

        // Wait for a random time between transactions (e.g., 5 minutes)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300000));

        // Move to the next wallet index
        walletIndex++;
    }

    console.log(`Completed transactions for today.`);
}

// Helper function to get random gas price
function randomGasPrice(web3Instance) {
    const minGwei = new BN(web3Instance.utils.toWei('0.05', 'gwei'));
    const maxGwei = new BN(web3Instance.utils.toWei('0.054', 'gwei'));
    const randomGwei = minGwei.add(new BN(Math.floor(Math.random() * (maxGwei.sub(minGwei).toNumber()))));
    return randomGwei;
}

main().catch(console.error);
