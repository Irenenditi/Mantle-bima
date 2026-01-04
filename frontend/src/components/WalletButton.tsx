import { useWallet } from '../contexts/WalletContext';

const WalletButton = () => {
  const { 
    connectWallet, 
    disconnectWallet, 
    isConnected, 
    account,
    chainId
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center space-x-4">
      {isConnected ? (
        <>
          <div className="flex items-center space-x-2 bg-gray-800 rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-white">
              {chainId === '0x1388' ? 'Mantle' : 'Wrong Network'}
            </span>
          </div>
          <div className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium">
            {account && formatAddress(account)}
          </div>
          <button
            onClick={disconnectWallet}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletButton;
