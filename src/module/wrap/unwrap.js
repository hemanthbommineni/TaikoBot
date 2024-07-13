require('dotenv').config();
const { getWeb3 } = require('../../../config/web3');
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

async function unwrap(amount, gasPrice, nonce, walletAddress, privateKey) {
    const web3 = getWeb3();
    const contract = new web3.eth.Contract(contractABI, AppConstant.wrap);
    
    const amountWei = web3.utils.toWei(amount.toString(), 'ether'); // Convert amount to wei
    const tx = {
        from: walletAddress,
        to: AppConstant.wrap,
        gas: AppConstant.maxGas,
        gasPrice: gasPrice,
        data: contract.methods.withdraw(amountWei).encodeABI(),
        nonce: nonce,
        chainId: 167000
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return receipt.transactionHash;
}

module.exports = {
    unwrap
};
