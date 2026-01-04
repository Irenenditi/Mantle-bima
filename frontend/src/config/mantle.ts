// Mantle Network configuration
export const MANTLE_NETWORK = {
  chainId: '0x1388', // Mantle mainnet
  chainName: 'Mantle',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.mantle.xyz'],
  blockExplorerUrls: ['https://explorer.mantle.xyz/'],
};

// NFT Contract Address (replace with your deployed contract address)
export const NFT_CONTRACT_ADDRESS = '0xYOUR_NFT_CONTRACT_ADDRESS';

// ABI for ERC-721 NFT contract (simplified version)
export const NFT_ABI = [
  // ERC-721 Standard Functions
  'function name() view returns (string memory)',
  'function symbol() view returns (string memory)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function safeMint(address to, string memory tokenURI) external',
  'function tokenURI(uint256 tokenId) view returns (string memory)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
];
