'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StampCard from '@/app/components/StampCard';
import * as anchor from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS, WEBSITE_URL } from '@/lib/config';
import toast, { Toaster } from 'react-hot-toast';

export default function GuideProfilePage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [guideData, setGuideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nftMetadata, setNftMetadata] = useState(null);

  useEffect(() => {
    const fetchGuideData = async () => {
      try {
        setLoading(true);
        
        // Create a connection
        const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));
        
        // Parse the guide ID to get the authority and index
        const [authority, indexStr] = id.split('-');
        
        if (!authority || !indexStr) {
          throw new Error('Invalid guide ID format');
        }
        
        // Convert authority to PublicKey and index to BN
        const authorityPubkey = new anchor.web3.PublicKey(authority);
        const index = parseInt(indexStr, 10);
        
        if (isNaN(index)) {
          throw new Error('Invalid guide index');
        }
        
        // Find the guide account PDA
        const programId = new anchor.web3.PublicKey(PROGRAM_ACCOUNT_ADDRESS);
        const [guideAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("guide"), 
            authorityPubkey.toBuffer(), 
            new anchor.BN(index).toArrayLike(Buffer, 'le', 8)
          ],
          programId
        );
        
        // Initialize program with the IDL
        const provider = new anchor.AnchorProvider(
          connection,
          null, // No wallet needed for reading
          { commitment: 'confirmed' }
        );
        
        const program = new anchor.Program(programIDL, provider);
        
        // Fetch the guide account data
        const accountData = await program.account.guideAccount.fetch(guideAccount);
        
        // Convert the account data to a more usable format
        const guide = {
          ...accountData,
          status: Object.keys(accountData.status)[0],
          affiliationType: Object.keys(accountData.affiliationType)[0],
          authority: accountData.authority.toString(),
          index: accountData.index.toNumber(),
        };
        
        setGuideData(guide);
        
        // If the guide is approved, try to fetch their NFT metadata
        if (guide.status === 'approved') {
          // This would be a simplified approach - in a real app, you'd query the blockchain
          // for NFTs owned by the guide's walletAddress
          try {
            // Mock NFT metadata fetch - in a real app you'd use Metaplex or another service
            // to fetch the actual NFT metadata
            const mockNftMetadata = {
              name: `Verified Tour Guide: ${guide.name}`,
              image: guide.photoIdUri || '/placeholder-image.png',
              mintAddress: 'mock-mint-address-' + Math.random().toString(36).substring(2, 15),
              attributes: [
                { trait_type: "License Number", value: guide.icNumber },
                { trait_type: "Verification Status", value: "Verified" },
                { trait_type: "Affiliation Type", value: guide.affiliationType },
              ]
            };
            
            setNftMetadata(mockNftMetadata);
          } catch (nftError) {
            console.error("Error fetching NFT metadata:", nftError);
            // Non-critical error, so we won't set the main error state
          }
        }
        
      } catch (error) {
        console.error("Error fetching guide data:", error);
        setError(error.message || "Failed to load guide data");
        
        // Use mock data for demonstration if guide can't be fetched
        setGuideData({
          name: "Demo Guide",
          email: "demo@example.com",
          phone: "123-456-7890",
          icNumber: "123456-78-9012",
          walletAddress: "DEmocGpdzhshJ19XVhCDd8JRgi8qzYE9eWzTVgFFWMrA",
          licenseUri: "https://plum-tough-mongoose-147.mypinata.cloud/ipfs/QmExample",
          photoIdUri: "/download.jpeg",
          status: "approved",
          affiliationType: "freelance",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuideData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading guide profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <p className="font-medium">Error loading guide data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <Button 
          onClick={() => router.push('/guides')}
          className="mt-6"
          variant="outline"
        >
          Back to Guides
        </Button>
      </div>
    );
  }

  if (!guideData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg max-w-md">
          <p className="font-medium">Guide Not Found</p>
          <p className="text-sm mt-1">The guide you're looking for doesn't exist or has been removed.</p>
        </div>
        <Button 
          onClick={() => router.push('/guides')}
          className="mt-6"
          variant="outline"
        >
          Back to Guides
        </Button>
      </div>
    );
  }

  // Verification status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Verified</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column - Tour Guide Card */}
          <div className="md:col-span-1">
            <div className="sticky top-8">
              <StampCard 
                guideName={guideData.name}
                guideImage={guideData.photoIdUri}
                qrValue={`${WEBSITE_URL}/guides/${id}`}
              />
              
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  This license card can be verified by scanning the QR code.
                </p>
              </div>
            </div>
          </div>
          
          {/* Right column - Guide Details */}
          <div className="md:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{guideData.name}</CardTitle>
                    <CardDescription>Licensed Tour Guide</CardDescription>
                  </div>
                  {getStatusBadge(guideData.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500">Email:</span>
                          <span className="text-sm font-medium">{guideData.email}</span>
                        </div>
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500">Phone:</span>
                          <span className="text-sm font-medium">{guideData.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">License Details</h3>
                      <div className="space-y-2">
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500">IC Number:</span>
                          <span className="text-sm font-medium">{guideData.icNumber}</span>
                        </div>
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500">Affiliation:</span>
                          <span className="text-sm font-medium capitalize">{guideData.affiliationType}</span>
                        </div>
                        {guideData.affiliationType === 'agency' && guideData.agencyName && (
                          <div className="flex">
                            <span className="w-24 text-sm text-gray-500">Agency:</span>
                            <span className="text-sm font-medium">{guideData.agencyName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {guideData.status === 'approved' && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-3">Verification</h3>
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">This guide has been verified by ChaperoneME</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 ml-7">
                        Verification ensures that the guide has provided proper documentation and meets all requirements.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* License Documentation */}
            {guideData.licenseUri && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-xl">License Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">MOTAC License</span>
                      </div>
                      
                      <a 
                        href={guideData.licenseUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        View License
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* NFT Verification Badge (if verified) */}
            {guideData.status === 'approved' && nftMetadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Verification NFT</CardTitle>
                  <CardDescription>
                    This guide has a blockchain-verified digital certificate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-40 h-40 relative">
                      <Image 
                        src={nftMetadata.image} 
                        alt="NFT Badge" 
                        fill
                        className="object-cover rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/download.jpeg";
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-2">{nftMetadata.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {nftMetadata.attributes.map((attr, idx) => (
                          <div key={idx} className="flex">
                            <span className="w-24 text-xs text-gray-500">{attr.trait_type}:</span>
                            <span className="text-xs font-medium">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">NFT ID: {nftMetadata.mintAddress}</span>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                            toast.success('NFT details copied to clipboard!');
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy NFT Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 