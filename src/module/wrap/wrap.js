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

    return receipt.transactionHash;
}

module.exports = {
    wrap
};
