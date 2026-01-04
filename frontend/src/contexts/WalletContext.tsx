import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { MANTLE_NETWORK, NFT_ABI, NFT_CONTRACT_ADDRESS } from '../config/mantle';

type WalletContextType = {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  signer: ethers.JsonRpcSigner | null;
  provider: ethers.BrowserProvider | null;
  mintNFT: (tokenURI: string) => Promise<any>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await setupWeb3(accounts[0]);
          }
          
          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length > 0) {
              setupWeb3(accounts[0]);
            } else {
              disconnectWallet();
            }
          });

          // Listen for chain changes
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkWalletConnection();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  const setupWeb3 = async (account: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    
    setProvider(provider);
    setSigner(signer);
    setAccount(account);
    setChainId(`0x${network.chainId.toString(16)}`);
    setIsConnected(true);

    // Check if connected to Mantle network
    if (network.chainId.toString() !== MANTLE_NETWORK.chainId) {
      try {
        await switchToMantleNetwork();
      } catch (error) {
        console.error('Failed to switch to Mantle network:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this dApp!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await setupWeb3(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const switchToMantleNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MANTLE_NETWORK],
          });
        } catch (addError) {
          console.error('Error adding Mantle network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Mantle network:', switchError);
        throw switchError;
      }
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
  };

  const mintNFT = async (tokenURI: string) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_ABI,
        signer
      );

      const tx = await contract.safeMint(account, tokenURI);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connectWallet,
        disconnectWallet,
        isConnected,
        account,
        chainId,
        signer,
        provider,
        mintNFT,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
