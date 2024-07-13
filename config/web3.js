require('dotenv').config();
const { Web3 } = require('web3');

// List of RPC URLs for Ethereum networks
const rpcUrls = [
    'https://rpc.taiko.xyz',
    'https://rpc.mainnet.taiko.xyz',
    'https://rpc.ankr.com/taiko',
    'https://rpc.taiko.tools',
    'https://taiko.blockpi.network/v1/rpc/public'
];

let currentRpcIndex = 0;

// Function to get a new web3 instance using the current RPC URL
function getWeb3() {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrls[currentRpcIndex]));
    return web3;
}

// Function to switch to the next RPC URL in the list
function switchRpc() {
    currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length;
    console.log(`Switching to RPC: ${rpcUrls[currentRpcIndex]}`);
    return getWeb3();
}

// Example for handling multiple wallets
const wallets = [
    {
        privateKey: process.env.PRIVATE_KEY_1,
    },
    {
        privateKey: process.env.PRIVATE_KEY_2,
    }
    // Add more wallets as needed
];

// Initialize web3 instances for each wallet
const web3Instances = wallets.map(wallet => {
    const web3 = getWeb3();
    const account = web3.eth.accounts.privateKeyToAccount(wallet.privateKey);
    const walletAddress = account.address;

    console.log(`Wallet Address: ${walletAddress}`);

    return {
        web3,
        privateKey: wallet.privateKey,
        walletAddress
    };
});

module.exports = {
    getWeb3,
    switchRpc,
    wallets: web3Instances  // Exporting all initialized wallets
};
