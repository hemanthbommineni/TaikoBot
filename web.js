const Web3 = require('web3');

function getWeb3(privateKey) {
    const web3 = new Web3();
    if (privateKey.startsWith('0x')) {
        privateKey = privateKey.slice(2); // Remove '0x' prefix if present
    }
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    return web3;
}

module.exports = {
    getWeb3,
};
