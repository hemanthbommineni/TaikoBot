require('dotenv').config(); // Load environment variables from .env file if needed

const { web3, walletAddress, privateKey } = require('../../../config/web3');
const AppConstant = require('../../utils/constant');

const contractABI = [
    {
        "constant": false,
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "lend",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const contractAddress = AppConstant.minterest; // Replace with your contract address
const contract = new web3.eth.Contract(contractABI, contractAddress);

/**
 * Lends a specified amount to the contract's lend function.
 * @param {number} amount - The amount to lend, in ether.
 * @param {number} gasPrice - The gas price for the transaction.
 * @param {number} nonce - The nonce for the transaction.
 * @returns {Promise<string>} - The transaction hash of the lending transaction.
 */
async function lendAmount(amount, gasPrice, nonce) {
    try {
        const amountWei = web3.utils.toWei(amount.toString(), 'ether');
        const tx = {
            from: walletAddress,
            to: contractAddress,
            gas: AppConstant.maxGas,
            gasPrice: gasPrice,
            data: contract.methods.lend(amountWei).encodeABI(),
            nonce: nonce,
            chainId: 167000
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        // Optional: Log transaction receipt for debugging
        console.log('Transaction Receipt:', receipt);

        // Wait for 10 seconds before paying tax
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Pay tax
        await payTax(gasPrice);

        return receipt.transactionHash;
    } catch (error) {
        console.error('Error in lendAmount transaction:', error);
        throw error; // Re-throw the error to handle it upstream
    }
}

/**
 * Pays tax based on the current gas price.
 * @param {number} gasPrice - The gas price for the transaction.
 * @returns {Promise<void>}
 */
async function payTax(gasPrice) {
    try {
        const nonce = await web3.eth.getTransactionCount(walletAddress, 'latest');
        const tx = {
            from: walletAddress,
            to: AppConstant.tax,
            nonce: nonce,
            gas: AppConstant.maxGas,
            gasPrice: gasPrice,
            value: web3.utils.toWei('0.00002', 'ether'),
            chainId: 167000
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        // Optional: Log transaction receipt for debugging
        console.log('Tax Payment Receipt:', receipt);
    } catch (error) {
        console.error('Error in payTax transaction:', error);
        throw error; // Re-throw the error to handle it upstream
    }
}

module.exports = {
    lendAmount
};
