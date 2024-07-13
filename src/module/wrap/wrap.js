const { web3, walletAddress, privateKey } = require('../../../config/web3');
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

const wrapContract = new web3.eth.Contract(wrapABI, AppConstant.wrap);

async function wrap(amount, gasPrice) {
    try {
        const nonce = await web3.eth.getTransactionCount(walletAddress);
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
    } catch (error) {
        console.error('Error in wrap transaction:', error);
        throw error; // Re-throw the error to handle it upstream
    }
}

module.exports = {
    wrap
};
