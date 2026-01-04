import { ethers } from 'ethers';
import dotenv from 'dotenv';
import MantleNFT from '../../contracts/MantleNFT.json' assert { type: 'json' };

dotenv.config();

// Initialize Mantle provider
const mantleRpcUrl = process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz';
const privateKey = process.env.WALLET_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('WALLET_PRIVATE_KEY is not set in environment variables');
}

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(mantleRpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// Contract address - should be set after deployment
let nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
let nftContract = null;

// Initialize contract instance
const getNFTContract = async () => {
  if (!nftContractAddress) {
    throw new Error('NFT contract address not set');
  }
  if (!nftContract) {
    nftContract = new ethers.Contract(nftContractAddress, MantleNFT.abi, wallet);
  }
  return nftContract;
};

// Mint NFT
const mintNFT = async (to, tokenURI) => {
  try {
    const contract = await getNFTContract();
    const tx = await contract.safeMint(to, tokenURI);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      tokenId: receipt.events?.find(e => e.event === 'Transfer')?.args?.tokenId?.toString()
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get token URI
const getTokenURI = async (tokenId) => {
  try {
    const contract = await getNFTContract();
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Error getting token URI:', error);
    throw error;
  }
};

// Get owner of token
const getTokenOwner = async (tokenId) => {
  try {
    const contract = await getNFTContract();
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('Error getting token owner:', error);
    throw error;
  }
};

export {
  mintNFT,
  getTokenURI,
  getTokenOwner,
  getNFTContract
};
