# Taiko Transaction Bot

This Taiko transaction bot is a daily routine bot, its job is to complete transactions within the range of 140 to 144 transactions within an UTC day, with each transaction has a randomized interval.

## Prerequisite

To run this bot you need to:

- Taiko Mainnet Account 0.001 ETH Balance.
- Node.js Installed.

## BOT Feature Overview

This BOT automates various tasks. Below is a detailed breakdown of the features and the sequence of operations it performs.

### Bot Feature

- Wraps a random amount between 0.0003 ETH to 0.0005 ETH to WETH.
- Unwraps all WETH back to ETH.
- This bot will repeat all transactions until it reaches the daily max point.


## Set Up

### Step-by-Step Instructions

1. **Update the package lists:**

```sh
sudo apt update && sudo apt upgrade -y
```
```sh
sudo apt-get install screen git nano -y
```

3. **Clone the repository:**

    ```sh
    git clone https://github.com/hemanthbommineni/TaikoBot.git
    ```

4. **Navigate to the project directory:**

    ```sh
    cd TaikoBot
    ```

5. **Install Node.js (if not already installed):**

    ```sh
    sudo apt-get install nodejs
    ```
    ```sh    
    sudo apt-get install npm
    ```

6. **Install the project dependencies:**

    ```sh
    npm install
    ```

7. **Create a `.env` file in the project directory and add your address & private key:**

    ```sh
    echo "WALLET_ADDRESS_1=your_wallet_address_here" > .env
    ```
    ```sh
    echo "PRIVATE_KEY_1=your_private_key_here" >> .env
    ```

## Running the Bot

confirm .env file is accurate and looks like this

```sh
cd TaikoBot
```
```sh
vi .env
```

  
WALLET_ADDRESS_1=''

PRIVATE_KEY_1=''

WALLET_ADDRESS_2=''	

PRIVATE_KEY_2=''


### One-time Run

To run the bot once:

```sh
npm run start
```
### Run in the background

```sh
screen -S taiko
```
```sh
cd TaikoBot
```
```sh
npm start
```
### Scheduled Run

To set up the bot to run every day at 1:30 AM UTC, follow these steps:

1.	Make the setup-cron.sh script executable:
 ```sh
chmod +x setup-cron.sh
```
2.	Run the setup-cron.sh script:
```sh
./setup-cron.sh
```
### Next udpates

- Lends a random amount between 1 USDC to 2 USDC into the minterest Dapp.
- Withdraws all USDC from the minterest Dapp
- Multiple wallets support (currently only one wallets is supported

## CONTRIBUTE

Feel free to fork and contribute.

Credit to https://github.com/0xFess , as i forked the baseline from his repo.

## SUPPORT
Telegram : @tango20_20 , for any help with suppport.
Each tx contain tiny amount of tax to support next Bot with various features
