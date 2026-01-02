# Bima x Mantle Network Integration

This project integrates Bima with the Mantle Network for wallet connectivity and NFT creation.

## Features

- Connect MetaMask wallet to Mantle Network
- Mint NFTs on Mantle Network
- View NFT metadata
- Deploy custom ERC-721 smart contracts

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MetaMask browser extension
- Mantle Network added to MetaMask

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mantlebima
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install smart contract dependencies
   cd ../
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your private key and other settings
   ```

## Smart Contract Deployment

1. **Compile the contract**
   ```bash
   npx hardhat compile
   ```

2. **Deploy to Mantle Testnet**
   ```bash
   npx hardhat run scripts/deploy.js --network mantleTestnet
   ```

3. **Deploy to Mantle Mainnet**
   ```bash
   npx hardhat run scripts/deploy.js --network mantleMainnet
   ```

   After deployment, update the `NFT_CONTRACT_ADDRESS` in your `.env` file.

## Running the Frontend

1. **Start the development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Using the Application

1. **Connect your wallet**
   - Click the "Connect Wallet" button
   - Approve the connection in MetaMask
   - Switch to Mantle Network when prompted

2. **Mint an NFT**
   - Enter a valid IPFS or HTTP URL pointing to your NFT metadata
   - Click "Mint NFT"
   - Confirm the transaction in MetaMask

## Smart Contract Details

The `MantleNFT` contract is an ERC-721 compliant NFT contract with the following features:

- Minting new NFTs with custom metadata URIs
- Standard ERC-721 functionality (transfer, approve, etc.)
- OpenZeppelin's Ownable for access control
- Counter for token ID generation

## Security Considerations

- Never commit your private key to version control
- Use environment variables for sensitive information
- Test contracts on testnet before deploying to mainnet
- Consider using a multisig wallet for contract ownership

## License

MIT
