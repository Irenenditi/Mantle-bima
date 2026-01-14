import { BrowserProvider, JsonRpcSigner } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

let provider: BrowserProvider | null = null;
let signer: JsonRpcSigner | null = null;

const checkMetaMaskInstalled = (): boolean => {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
};

export const connectMetaMask = async () => {
  if (!checkMetaMaskInstalled()) {
    window.open('https://metamask.io/download.html', '_blank');
    throw new Error('MetaMask is not installed');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create a provider and signer
    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    
    // Get the network
    const network = await provider.getNetwork();
    
    return {
      address: accounts[0],
      signer,
      provider,
      network
    };
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    throw error;
  }
};

export const disconnectMetaMask = () => {
  provider = null;
  signer = null;
};

export const getSigner = () => signer;
export const getProvider = () => provider;

export const onAccountsChanged = (callback: (accounts: string[]) => void) => {
  if (!checkMetaMaskInstalled()) return () => {};
  
  const handleAccountsChanged = (accounts: string[]) => {
    callback(accounts);
  };
  
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  
  return () => {
    if (window.ethereum.removeListener) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  };
};

export const onChainChanged = (callback: (chainId: string) => void) => {
  if (!checkMetaMaskInstalled()) return () => {};
  
  const handleChainChanged = (chainId: string) => {
    callback(chainId);
  };
  
  window.ethereum.on('chainChanged', handleChainChanged);
  
  return () => {
    if (window.ethereum.removeListener) {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };
};
