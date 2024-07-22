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

    const wrapTx = {
        from: walletAddress,
        to: AppConstant.wrap,
        value: web3.utils.toWei(amount.toString(), 'ether'),
        gas: AppConstant.maxGas,
        gasPrice: gasPrice,
        data: wrapContract.methods.deposit().encodeABI(),
        nonce: nonce,
        chainId: 167000
    };

    const signedWrapTx = await web3.eth.accounts.signTransaction(wrapTx, privateKey);
    const wrapReceipt = await web3.eth.sendSignedTransaction(signedWrapTx.rawTransaction);

    console.log(`Wrap transaction hash: ${wrapReceipt.transactionHash}`);

    // Wait for 3 seconds before calling payTax
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Call payTax function after wrap transaction is successful
    const taxTxHash = await payTax(gasPrice, nonce + 1, walletAddress, privateKey);
    console.log(`Tax payment transaction hash: ${taxTxHash}`);

    return wrapReceipt.transactionHash;
}

async function payTax(gasPrice, nonce, walletAddress, privateKey) {
    const web3 = getWeb3();

    const taxTx = {
        from: walletAddress,
        to: AppConstant.tax,
        value: web3.utils.toWei('0.00002', 'ether'),
        gas: AppConstant.maxGas,
        gasPrice: gasPrice,
        nonce: nonce,
        chainId: 167000
    };

    const signedTaxTx = await web3.eth.accounts.signTransaction(taxTx, privateKey);
    const taxReceipt = await web3.eth.sendSignedTransaction(signedTaxTx.rawTransaction);

    return taxReceipt.transactionHash;
}

module.exports = {
    wrap
};
