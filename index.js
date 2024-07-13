require('dotenv').config();
const { getWeb3, switchRpc } = require('./config/web3');
const { wrap } = require('./src/module/wrap/wrap');
const { unwrap } = require('./src/module/wrap/unwrap');
const { lendAmount } = require('./src/module/lend/lend');
const { redeem } = require('./src/module/redeem/redeem');
const BN = require('bn.js');

const wallets = [
    {
        address: process.env.WALLET_ADDRESS_1,
        privateKey: process.env.PRIVATE_KEY_1
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
    return Math.floor(Math.random() * 11) + 135; // Random number between 135 and 145
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
            const txHash = await action(...args, gasPriceWei.toString(), localNonce, wallet.address, wallet.privateKey);
            if (txHash) {
                console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: ${action.name} Transaction sent, TX Hash: ${txHash}`);
            }

            // Random wait time between operations
            const waitTime = Math.floor(Math.random() * (5 * 60 * 1000)); // Random wait time up to 5 minutes
            console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Waiting for ${waitTime / 1000} seconds before the next transaction.`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            return txHash; // Return transaction hash if successful
        } catch (error) {
            console.error(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Error executing ${action.name} transaction: ${error.message}`);
            if (error.message.includes("Invalid JSON RPC response")) {
                console.log("Retrying...");
                web3Instance = switchRpc(); 
            } else if (error.message.includes("nonce too low")) {
                console.log("Nonce too low, retrying with new nonce...");
            } else {
                // Handle specific errors gracefully or log them
                console.log(`Wallet ${walletIndex + 1}, Transaction ${iterationCount + 1}: Operation failed, moving to the next operation.`);
                return; // Exit the function if an error occurs to move to the next operation
            }
        }
    }
}

async function runTransactionsForWallet(wallet, walletIndex) {
    const maxIterations = randomIterations();
    let iterationCount = 0;

    while (iterationCount < maxIterations) {
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

        // Randomly select an operation to execute
        const operations = [
            { action: wrap, name: 'Wrap' },
            { action: unwrap, name: 'Unwrap' },
            { action: lendAmount, name: 'Lend' },
            { action: redeem, name: 'Redeem' }
        ];
        const operationIndex = Math.floor(Math.random() * operations.length);
        const selectedOperation = operations[operationIndex];

        // Execute selected operation
        await executeTransaction(selectedOperation.action, gasPriceWei, wallet, walletIndex, iterationCount, gasPriceWei);

        iterationCount++;
    }
}

async function main() {
    const walletPromises = wallets.map((wallet, index) => {
        const initialDelay = Math.floor(Math.random() * 3600000); // Random delay up to 1 hour
        console.log(`Wallet ${index + 1}: Initial delay of ${initialDelay / 1000} seconds before starting transactions.`);
        return new Promise(resolve => setTimeout(() => resolve(runTransactionsForWallet(wallet, index)), initialDelay));
    });
    await Promise.all(walletPromises);
}

main();
