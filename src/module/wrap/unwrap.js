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
        "name": "withdraw", 
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const contractAddress = process.env.CONTRACT_ADDRESS; // Replace with your contract address
const contract = new web3.eth.Contract(contractABI, contractAddress);

async function unwrap(amount, gasPrice) {
    try {
        const nonce = await web3.eth.getTransactionCount(walletAddress);
        const amountWei = web3.utils.toWei(amount.toString(), 'ether');
        const tx = {
            from: walletAddress,
            to: contractAddress,
            gas: AppConstant.maxGas,
            gasPrice: gasPrice,
            data: contract.methods.withdraw(amountWei).encodeABI(),
            nonce: nonce,
            chainId: 167000
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return receipt.transactionHash;
    } catch (error) {
        console.error('Error in unwrap transaction:', error);
        throw error; // Re-throw the error to handle it upstream
    }
}

module.exports = {
    unwrap
};
