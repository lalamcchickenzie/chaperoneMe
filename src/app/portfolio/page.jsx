'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS, WEBSITE_URL } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StampCard from '../components/StampCard';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function PortfolioPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Create a connection
        const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));
        
        // Initialize program with the IDL
        const programId = new anchor.web3.PublicKey(PROGRAM_ACCOUNT_ADDRESS);
        const provider = new anchor.AnchorProvider(
          connection,
          null, // No wallet needed for reading
          { commitment: 'confirmed' }
        );
        
        const program = new anchor.Program(programIDL, provider);
        
        try {
          // Find the admin account PDA
          const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("admin")],
            programId
          );
          
          // Fetch all guide accounts
          const allGuideAccounts = await program.account.guideAccount.all();
          
          // Filter guides linked to the connected wallet and are approved
          const walletGuides = allGuideAccounts
            .filter(account => {
              const walletAddress = account.account.walletAddress || '';
              const status = Object.keys(account.account.status || {})[0] || '';
              return walletAddress === publicKey.toString() && status === 'approved';
            })
            .map(account => ({
              ...account.account,
              publicKey: account.publicKey.toString(),
              status: Object.keys(account.account.status)[0],
              affiliationType: Object.keys(account.account.affiliationType)[0],
              authority: account.account.authority.toString(),
              index: account.account.index.toNumber(),
              id: `${account.account.authority.toString()}-${account.account.index.toNumber()}`
            }));
          
          // If no guides found, use demo data
          if (walletGuides.length === 0) {
            setUseDemoData(true);
            setGuides(getDemoGuides(publicKey.toString()));
          } else {
            setGuides(walletGuides);
          }
        } catch (error) {
          console.error("Error fetching guide accounts:", error);
          
          // Handle the error gracefully
          toast.error("Failed to fetch blockchain data. Using demo data instead.");
          
          // Use mock data if blockchain fetch fails
          setUseDemoData(true);
          setGuides(getDemoGuides(publicKey.toString()));
        }
      } catch (error) {
        console.error("Error in portfolio page:", error);
        setError(error.message || "Failed to load portfolio data");
        
        // Use mock data as fallback
        setUseDemoData(true);
        setGuides(getDemoGuides(publicKey.toString()));
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, [publicKey, connected]);
  
  // Demo data generator function
  const getDemoGuides = (walletAddress) => {
    return [
      {
        id: `${walletAddress.substring(0, 8)}-0`,
        name: "Demo Guide 1",
        email: "demo1@example.com",
        phone: "555-123-4567",
        photoIdUri: "/download.jpeg",
        status: "approved",
        affiliationType: "freelance",
        walletAddress: walletAddress,
      },
      {
        id: `${walletAddress.substring(0, 8)}-1`,
        name: "Demo Guide 2",
        email: "demo2@example.com",
        phone: "555-987-6543",
        photoIdUri: "/download.jpeg",
        status: "approved",
        affiliationType: "agency",
        agencyName: "Demo Agency",
        walletAddress: walletAddress,
      }
    ];
  };

  // Show wallet connect prompt if wallet is not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />
        
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your NFT Portfolio</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              View and manage your verified NFTs linked to your wallet address. These represent your verified credentials as a tour guide.
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>Please connect your wallet to view your NFT portfolio</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Image 
                src="/wallet-icon.svg" 
                alt="Connect Wallet" 
                width={120} 
                height={120}
                className="mb-6 opacity-70"
              />
              <p className="text-center text-gray-600 mb-6">
                Connect your Solana wallet to view the verified guide NFTs linked to your account.
              </p>
              <p className="text-sm text-gray-500 italic">
                Use the wallet button in the navigation bar to connect
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your NFT Portfolio</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            View and manage your verified NFTs linked to your wallet address. These represent your verified credentials as a tour guide.
          </p>
          {useDemoData && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                Demo Mode: Showing sample data
              </span>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Error Loading Portfolio</CardTitle>
              <CardDescription>We encountered a problem loading your NFT data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="grid" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {guides.map((guide) => (
                  <div key={guide.id} className="flex flex-col items-center">
                    <Link href={`/guides/${guide.id}`} className="block w-full max-w-xs">
                      <StampCard 
                        guideName={guide.name}
                        guideImage={guide.photoIdUri}
                        qrValue={`${WEBSITE_URL}/guides/${guide.id}`}
                      />
                    </Link>
                    <div className="text-center mt-4">
                      <h3 className="font-medium text-lg">{guide.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{guide.affiliationType} Tour Guide</p>
                      {guide.affiliationType === 'agency' && guide.agencyName && (
                        <p className="text-sm text-gray-600">{guide.agencyName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="list" className="mt-0">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {guides.map((guide, index) => (
                  <div 
                    key={guide.id} 
                    className={`p-4 flex items-center ${index !== guides.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="h-16 w-16 rounded-full overflow-hidden mr-4 flex-shrink-0">
                      <Image
                        src={guide.photoIdUri || "/download.jpeg"}
                        alt={guide.name}
                        width={64}
                        height={64}
                        className="object-cover h-full w-full"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">{guide.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{guide.affiliationType} Tour Guide</p>
                      {guide.affiliationType === 'agency' && guide.agencyName && (
                        <p className="text-sm text-gray-600">{guide.agencyName}</p>
                      )}
                    </div>
                    <div>
                      <Link href={`/guides/${guide.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
} 