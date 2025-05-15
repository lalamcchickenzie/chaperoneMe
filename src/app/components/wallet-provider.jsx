"use client";

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamic import of wallet components to reduce initial bundle size
const DynamicWalletProvider = dynamic(
  async () => {
    const [
      { ConnectionProvider, WalletProvider },
      { WalletAdapterNetwork },
      { PhantomWalletAdapter, SolflareWalletAdapter, LedgerWalletAdapter },
      { WalletModalProvider },
      { clusterApiUrl }
    ] = await Promise.all([
      import('@solana/wallet-adapter-react'),
      import('@solana/wallet-adapter-base'),
      import('@solana/wallet-adapter-wallets'),
      import('@solana/wallet-adapter-react-ui'),
      import('@solana/web3.js')
    ]);

    return function SolanaWalletProvider({ children }) {
      // Use devnet for development environment
      const network = WalletAdapterNetwork.Devnet;
      
      // Configure RPC endpoint
      const endpoint = useMemo(() => clusterApiUrl(network), [network]);

      // Set up wallet adapters with extended capabilities
      const wallets = useMemo(() => {
        // Create wallet adapters with all required capabilities
        return [
          new PhantomWalletAdapter(),
          new SolflareWalletAdapter(),
          // new BackpackWalletAdapter(),
          new LedgerWalletAdapter()
        ];
      }, []);

      return (
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      );
    };
  },
  { ssr: false }
);

// Main provider component
export const WalletProvider = ({ children }) => (
  <DynamicWalletProvider>{children}</DynamicWalletProvider>
);
