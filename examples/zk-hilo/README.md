## zk-HiLo

zk-HiLo is intended as a 'Hello World' example for using the Poseidon Labs zkShuffle contracts.

This repo contains a set of contracts and a frontend web app for playing an on-chain, zk-Powered game of Hi-Lo against a server.

## Setup

- In the `/frontend` directory:

```bash
yarn install
yarn dev
```

- In the `/contracts` directory:

```bash
yarn install
foundryup
```

## Deploying contracts locally

Deploying the contracts to a local, anvil blockchain will allow you to play the game from the frontend.

- In the `/contracts` directory: 
```bash
anvil
```
- After running anvil, it should give you a mnemonic in the console, for example: 
```bash
Mnemonic:          test test test test test test test test test test test junk
```
- Copy that to the first command and run both commands.
```bash
export MNEMONIC="<Your deployer mnemonic here>"
forge script script/Deploy.s.sol --broadcast --fork-url http://localhost:8545
```

## Change your .env.local file and set up wallet 

- Go to `/frontend` directory, there is a sample environment file called `.env.example`. Create a new file and name it `.env.local`. Copy paste the content in `.env.example` to `.env.local`:
```bash
NEXT_PUBLIC_TESTNET_URL=
NEXT_PUBLIC_TESTNET_WALLET_KEY=
```

Copy and paste the private key anvil generated in the previous step to `NEXT_PUBLIC_TESTNET_WALLET_KEY=`, you should see something like this in the terminal after you run the `anvil` command, just pick any one of them:
```bash
Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
(2) 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
(3) 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
(4) 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```
-

## Set up enviornment in the browser 
- After running `yarn dev` at the `/frontend` directory, you can now import the wallet using the private key you picked in previous steps to import a new wallet. Remember to change your blockchain network to `localhost:8545`. You may now able to start the game. 

