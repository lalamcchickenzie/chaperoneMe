'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { publicKey } = useWallet();
  const ADMIN_WALLET = "GsjREUyUEkFRAhoSj1q9Tg4tPGCyoEAoTyFiZjqxKD92";

  useEffect(() => {
    if (publicKey && publicKey.toString() === ADMIN_WALLET) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  const handleJoinClick = () => {
    // Dispatch custom event to open join form
    const event = new Event('openJoinForm');
    window.dispatchEvent(event);
  };

  return (
    <nav className="bg-[#2E3A50] text-white py-4 px-6 shadow-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Logo and nav links */}
        <div className="flex items-center">
          <Link href="/" className="font-mono text-xl font-bold mr-10">
            ChaperoneMe
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-blue-300 transition-colors">
              Home
            </Link>
            <Link href="/#about-us" className="hover:text-blue-300 transition-colors">
              About
            </Link>
            <Link href="/guides" className="hover:text-blue-300 transition-colors">
              Guides Directory
            </Link>
            <button 
              onClick={handleJoinClick}
              className="hover:text-blue-300 transition-colors bg-transparent border-none p-0 text-white"
            >
              Join Us
            </button>
            {isAdmin && (
              <Link href="/verify" className="hover:text-blue-300 transition-colors">
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Wallet connect button */}
        <div className="flex items-center space-x-4">
          <WalletMultiButton className="wallet-adapter-button" />

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden mt-3 px-4 pt-2 pb-4 space-y-3">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/#about-us"
            className="block px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            href="/guides"
            className="block px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Guides Directory
          </Link>
          <button
            onClick={() => {
              handleJoinClick();
              setIsOpen(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-blue-700 transition-colors bg-transparent text-white"
          >
            Join Us
          </button>
          {isAdmin && (
            <Link
              href="/verify"
              className="block px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Admin
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar; 