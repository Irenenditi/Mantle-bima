import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

const NFTMinter = () => {
  const [tokenURI, setTokenURI] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const { mintNFT, isConnected } = useWallet();

  const handleMint = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!tokenURI) {
      alert('Please enter a valid token URI');
      return;
    }

    setIsMinting(true);
    setMintStatus('Minting your NFT...');

    try {
      const receipt = await mintNFT(tokenURI);
      setMintStatus(`🎉 NFT minted successfully! Transaction hash: ${receipt.transactionHash}`);
      setTokenURI('');
    } catch (error) {
      console.error('Minting error:', error);
      setMintStatus('❌ Failed to mint NFT. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Mint New NFT</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="tokenURI" className="block text-sm font-medium text-gray-300 mb-1">
            Token URI (IPFS or URL)
          </label>
          <input
            type="text"
            id="tokenURI"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            placeholder="ipfs://Qm... or https://..."
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-400">
            Enter the URI pointing to your NFT metadata (JSON file)
          </p>
        </div>

        <button
          onClick={handleMint}
          disabled={isMinting || !isConnected}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
            isMinting || !isConnected
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600'
          } transition-colors`}
        >
          {isMinting ? 'Minting...' : 'Mint NFT'}
        </button>

        {mintStatus && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg text-sm text-white">
            {mintStatus}
          </div>
        )}

        {!isConnected && (
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-sm text-yellow-300">
            Please connect your wallet to mint an NFT
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTMinter;
