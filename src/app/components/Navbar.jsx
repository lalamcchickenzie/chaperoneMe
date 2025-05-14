'use client';

import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Navbar() {
  const { publicKey } = useWallet();
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  const handleJoinClick = () => {
    if (publicKey) {
      // Dispatch a custom event that the page can listen for
      window.dispatchEvent(new CustomEvent('openJoinForm'));
    } else {
      setShowWalletPrompt(true);
    }
  };

  return (
    <>
      <nav className="flex justify-between items-center p-4 bg-[#1A2A3A]">
        <div className="flex items-center space-x-4">
          <a href="/" className="nav-link">HOME</a>
          <a href="#about-us" className="nav-link">ABOUT US</a>
          <a href="#" className="nav-link" onClick={handleJoinClick}>JOIN US TODAY</a>
        </div>
        <div className="wallet-adapter-dropdown">
          <WalletMultiButton className="wallet-adapter-button" />
        </div>
      </nav>

      {/* Wallet Connection Prompt */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Connect Wallet</h2>
              <button 
                onClick={() => setShowWalletPrompt(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-6">Please connect your wallet to proceed with the verification process.</p>
            <div className="flex justify-center">
              <WalletMultiButton className="wallet-adapter-button" />
            </div>
          </div>
        </div>
      )}
    </>
  );
} 