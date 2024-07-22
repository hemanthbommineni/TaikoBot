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

    const amountWei = web3.utils.toWei(amount.toString(), 'ether');
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

    console.log(`Unwrap transaction hash: ${receipt.transactionHash}`);

    // Wait for 5 seconds before calling payTax
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Call payTax function after unwrap transaction is successful
    const taxTxHash = await payTax(gasPrice, nonce + 1, walletAddress, privateKey);
    console.log(`Tax payment transaction hash: ${taxTxHash}`);

    return receipt.transactionHash;
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
    unwrap
};
