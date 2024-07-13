require('dotenv').config();
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

        return receipt.transactionHash;
    } catch (error) {
        console.error('Error in lendAmount transaction:', error);
        throw error; // Re-throw the error to handle it upstream
    }
}

module.exports = {
    lendAmount
};
