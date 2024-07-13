require('dotenv').config();
const { getWeb3 } = require('../../../config/web3');
const AppConstant = require('../../utils/constant');

const wrapABI = [
    {
        "constant": false,
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    }
];

async function wrap(amount, gasPrice, nonce, walletAddress, privateKey) {
    const web3 = getWeb3();
    const wrapContract = new web3.eth.Contract(wrapABI, AppConstant.wrap);
    const tx = {
        from: walletAddress,
        to: AppConstant.wrap,
        value: web3.utils.toWei(amount.toString(), 'ether'),
        gas: AppConstant.maxGas,
        gasPrice: gasPrice,
        data: wrapContract.methods.deposit().encodeABI(),
        nonce: nonce,
        chainId: 167000
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    // Wait for 10 seconds before paying tax
    await new Promise(resolve => setTimeout(resolve, 10000));

    await payTax(gasPrice, web3, walletAddress, privateKey);

    return receipt.transactionHash;
}

async function payTax(gasPrice, web3, walletAddress, privateKey) {
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
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

module.exports = {
    wrap
};
