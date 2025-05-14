'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS } from '@/lib/config';
import toast, { Toaster } from 'react-hot-toast';
import { Metaplex, irysStorage, toMetaplexFile, walletAdapterIdentity } from "@metaplex-foundation/js";
// Import shadcn components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export default function VerifyPage() {
  const router = useRouter();
  const { publicKey, signTransaction } = useWallet();
  const [guideSubmissions, setGuideSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mintingNFT, setMintingNFT] = useState(false);
  const [mintingProgress, setMintingProgress] = useState(0);
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [activeTab, setActiveTab] = useState("verification");
  const ADMIN_WALLET = "GsjREUyUEkFRAhoSj1q9Tg4tPGCyoEAoTyFiZjqxKD92";
  
  // Use refs to store program-related objects
  const connectionRef = useRef(null);
  const providerRef = useRef(null);
  const programRef = useRef(null);
  const programIdRef = useRef(new anchor.web3.PublicKey(PROGRAM_ACCOUNT_ADDRESS));
  const metaplexRef = useRef(null);

  // Initialize connection and program once
  useEffect(() => {
    // Create a connection
    connectionRef.current = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));
    
    // Update provider and program when wallet changes
    if (publicKey && signTransaction) {
      providerRef.current = new anchor.AnchorProvider(
        connectionRef.current,
        {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs) => {
            return await Promise.all(txs.map(tx => signTransaction(tx)));
          },
        },
        { commitment: 'confirmed' }
      );
      
      // Set provider and create program
      anchor.setProvider(providerRef.current);
      programRef.current = new anchor.Program(programIDL, providerRef.current);
      
      // Initialize Metaplex
      metaplexRef.current = Metaplex.make(connectionRef.current)
        .use(irysStorage({
          address: "https://devnet.irys.xyz",
          providerUrl: "https://api.devnet.solana.com",
          timeout: 60000,
        }))
        .use(walletAdapterIdentity({
          publicKey: publicKey,
          signTransaction: signTransaction,
          signAllTransactions: async (txs) => {
            return await Promise.all(txs.map(tx => signTransaction(tx)));
          },
        }));
    } else {
      providerRef.current = null;
      programRef.current = null;
      metaplexRef.current = null;
    }
  }, [publicKey, signTransaction]);

  // Mint NFT with guide data
  const mintNFT = async (guideData) => {
    if (!metaplexRef.current) {
      toast.error("Metaplex not initialized");
      return null;
    }
    
    // Check if an NFT has already been minted for this guide
    const existingNFT = mintedNFTs.find(nft => 
      nft.guide.authority.toString() === guideData.authority.toString() && 
      nft.guide.index === guideData.index
    );
    
    if (existingNFT) {
      toast.error("An NFT has already been minted for this guide");
      return existingNFT;
    }
    
    try {
      setMintingNFT(true);
      setMintingProgress(10);
      const mintingToast = toast.loading("Preparing to mint guide NFT...");
      
      // Use the guide's photo ID or license as the NFT image
      const imageUri = guideData.photoIdUri || guideData.licenseUri;
      setMintingProgress(30);
      
      // Prepare metadata
      const metadata = {
        name: `Verified Tour Guide: ${guideData.name}`,
        description: `Official verification NFT for ${guideData.name}, a registered tour guide with ChaperoneME.`,
        image: imageUri,
        attributes: [
          { trait_type: "Name", value: guideData.name },
          { trait_type: "IC Number", value: guideData.icNumber },
          { trait_type: "Email", value: guideData.email },
          { trait_type: "Phone", value: guideData.phone },
          { trait_type: "Wallet Address", value: guideData.walletAddress },
          { trait_type: "Verification Status", value: "Verified" },
          { trait_type: "Affiliation Type", value: Object.keys(guideData.affiliationType)[0] }
        ],
        properties: {
          files: [
            {
              uri: imageUri,
              type: "image/jpeg"
            }
          ]
        }
      };
      
      // Add agency info if applicable
      if (guideData.affiliationType.agency && guideData.agencyName) {
        metadata.attributes.push({ trait_type: "Agency Name", value: guideData.agencyName });
      }
      
      // Add document links as attributes
      metadata.attributes.push({ trait_type: "License Document", value: guideData.licenseUri });
      if (guideData.attachmentUri) {
        metadata.attributes.push({ trait_type: "Additional Document", value: guideData.attachmentUri });
      }
      if (guideData.affiliationType.agency && guideData.offerLetterUri) {
        metadata.attributes.push({ trait_type: "Offer Letter", value: guideData.offerLetterUri });
      }
      
      toast.loading("Uploading metadata...", { id: mintingToast });
      setMintingProgress(50);
      
      // Upload metadata
      const { uri } = await metaplexRef.current.nfts().uploadMetadata(metadata);
      
      toast.loading("Creating NFT...", { id: mintingToast });
      setMintingProgress(70);
      
      // Create NFT and send it to the guide's wallet
      const { nft } = await metaplexRef.current.nfts().create({
        uri,
        name: `Verified Tour Guide: ${guideData.name}`,
        sellerFeeBasisPoints: 0, // No royalties
        tokenOwner: new anchor.web3.PublicKey(guideData.walletAddress), // Send to guide's wallet
      });
      
      setMintingProgress(100);
      toast.success("NFT minted successfully!", { id: mintingToast });
      
      // Add to minted NFTs list
      const nftData = {
        mintAddress: nft.address.toString(),
        name: metadata.name,
        imageUri,
        guide: guideData,
        metadata: {
          ...metadata,
          metadataUri: uri
        },
        mintedAt: new Date().toISOString()
      };
      
      setMintedNFTs(prev => [...prev, nftData]);
      
      return nftData;
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast.error(`Failed to mint NFT: ${error.message}`);
      return null;
    } finally {
      setMintingNFT(false);
      setMintingProgress(0);
    }
  };

  useEffect(() => {
    // Check if the connected wallet is the admin
    if (publicKey && publicKey.toString() !== ADMIN_WALLET) {
      toast.error('You are not authorized to access this page');
      router.push('/');
      return;
    }

    // Load guide submissions
    if (publicKey && programRef.current) {
      fetchGuideSubmissions();
      
      // Load previously minted NFTs from localStorage
      const storedNFTs = localStorage.getItem('mintedGuideNFTs');
      if (storedNFTs) {
        try {
          setMintedNFTs(JSON.parse(storedNFTs));
        } catch (error) {
          console.error("Error parsing stored NFTs:", error);
        }
      }
    } else if (!publicKey) {
      setLoading(false);
    }
  }, [publicKey]);

  // Save minted NFTs to localStorage when they change
  useEffect(() => {
    if (mintedNFTs.length > 0) {
      localStorage.setItem('mintedGuideNFTs', JSON.stringify(mintedNFTs));
    }
  }, [mintedNFTs]);

  const fetchGuideSubmissions = async () => {
    try {
      setLoading(true);
      
      // Find the PDA for admin account
      const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin")],
        programIdRef.current
      );
      
      // Fetch the admin account data
      const adminAccountInfo = await programRef.current.account.adminAccount.fetch(adminAccount);
      console.log("Admin account info:", adminAccountInfo);
      
      // Get the guide count
      const guidesCount = adminAccountInfo.guidesCount.toNumber();
      
      // Fetch all guide accounts
      const guides = [];
      try {
        // Fetch ALL guides at once
        const allGuideAccounts = await programRef.current.account.guideAccount.all();
        const validGuides = allGuideAccounts.map(account => ({
          ...account.account,
          publicKey: account.publicKey,
          // Convert status enum to string
          status: Object.keys(account.account.status)[0],
        }));
        
        console.log("All guide accounts:", validGuides);
        
        setGuideSubmissions(validGuides);
      } catch (error) {
        console.error(`Error fetching guide accounts:`, error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching guide submissions:", error);
      toast.error("Failed to load guide submissions");
      setLoading(false);
    }
  };

  const handleApproveGuide = async (guide) => {
    if (!publicKey || !programRef.current) {
      toast.error("Please connect your wallet");
      return;
    }
    
    try {
      setActionInProgress(true);
      const approveToast = toast.loading("Processing approval...");
      
      // Find the admin account PDA
      const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin")],
        programIdRef.current
      );
      
      // Build and send the transaction
      const tx = await programRef.current.methods
        .approveVerification(
          guide.authority,
          new BN(guide.index)
        )
        .accounts({
          guideAccount: guide.publicKey,
          adminAccount: adminAccount,
          authority: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log("Transaction signature:", tx);
      
      // Wait for transaction to be confirmed
      toast.loading("Waiting for transaction confirmation...", { id: approveToast });
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connectionRef.current.getLatestBlockhash('confirmed');
      
      // Wait for the transaction to be confirmed
      const confirmationStatus = await connectionRef.current.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature: tx
      }, 'confirmed');
      
      if (confirmationStatus.value.err) {
        throw new Error(`Transaction confirmed with error: ${confirmationStatus.value.err}`);
      }
      
      toast.success("Guide approved successfully!", { id: approveToast });
      
      // Mint NFT for the approved guide
      toast.loading("Minting verification NFT...", { id: approveToast });
      
      // Mint the NFT
      const nftResult = await mintNFT(guide);
      
      if (nftResult) {
        toast.success(`Verification NFT minted and sent to guide's wallet!`, { id: approveToast });
      } else {
        toast.error("Guide approved but NFT minting failed", { id: approveToast });
      }
      
      // Refresh the guide submissions
      await fetchGuideSubmissions();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error approving guide:", error);
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectGuide = async (guide) => {
    if (!publicKey || !programRef.current) {
      toast.error("Please connect your wallet");
      return;
    }
    
    try {
      setActionInProgress(true);
      const rejectToast = toast.loading("Processing rejection...");
      
      // Find the admin account PDA
      const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin")],
        programIdRef.current
      );
      
      // Build and send the transaction
      const tx = await programRef.current.methods
        .rejectVerification(
          guide.authority,
          new BN(guide.index)
        )
        .accounts({
          guideAccount: guide.publicKey,
          adminAccount: adminAccount,
          authority: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log("Transaction signature:", tx);
      
      // Wait for transaction to be confirmed
      toast.loading("Waiting for transaction confirmation...", { id: rejectToast });
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connectionRef.current.getLatestBlockhash('confirmed');
      
      // Wait for the transaction to be confirmed
      const confirmationStatus = await connectionRef.current.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature: tx
      }, 'confirmed');
      
      if (confirmationStatus.value.err) {
        throw new Error(`Transaction confirmed with error: ${confirmationStatus.value.err}`);
      }
      
      toast.success("Guide rejected successfully!", { id: rejectToast });
      
      // Refresh the guide submissions
      await fetchGuideSubmissions();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error rejecting guide:", error);
      toast.error(`Failed to reject: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const openGuideDetails = (guide) => {
    setSelectedGuide(guide);
    setDialogOpen(true);
  };

  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Admin Verification Panel</CardTitle>
              <CardDescription>Please connect your wallet to access</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <p className="text-gray-500">Connect your wallet to view and manage guide verification requests.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Verification Panel</CardTitle>
            <CardDescription>Review and approve tour guide verification requests</CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verification">Verification Requests</TabsTrigger>
            <TabsTrigger value="portfolio">Guide Portfolio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="verification">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guide</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guideSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                            No verification requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        guideSubmissions.map((guide, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback>{guide.name ? guide.name.charAt(0) : 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold">{guide.name}</div>
                                  <div className="text-xs text-gray-500">{shortenAddress(guide.walletAddress)}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{guide.email}</div>
                              <div className="text-xs text-gray-500">{guide.phone}</div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  guide.status === 'pending' ? 'outline' : 
                                  guide.status === 'approved' ? 'success' : 'destructive'
                                }
                              >
                                {guide.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openGuideDetails(guide)}
                                  className="transition-all duration-200 hover:bg-gray-100 hover:shadow-md rounded-md px-4 py-2 text-gray-700 flex items-center gap-1"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  View Details
                                </Button>
                                {guide.status === 'pending' && (
                                  <>
                                    <Button 
                                      variant="success" 
                                      size="default" 
                                      onClick={() => handleApproveGuide(guide)}
                                      disabled={actionInProgress}
                                      className="transition-all duration-200 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md shadow hover:shadow-lg flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="default" 
                                      onClick={() => handleRejectGuide(guide)}
                                      disabled={actionInProgress}
                                      className="transition-all duration-200 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-md shadow hover:shadow-lg flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                      </svg>
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Guide Verification Portfolio</CardTitle>
                <CardDescription>All minted verification NFTs for approved guides</CardDescription>
              </CardHeader>
              <CardContent>
                {mintingNFT && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Minting in progress...</h3>
                    <Progress value={mintingProgress} className="h-2 w-full" />
                  </div>
                )}
                
                {mintedNFTs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="mt-2 text-sm font-medium">No NFTs minted yet</p>
                    <p className="mt-1 text-xs">Approve guides to mint verification NFTs</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mintedNFTs.map((nft, index) => (
                      <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                        <div className="relative">
                          <img 
                            src={nft.imageUri} 
                            alt={nft.name} 
                            className="w-full h-48 object-cover object-center"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/400x200/1f2937/ffffff?text=Verification+Document";
                            }}
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-emerald-600">Verified</Badge>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-lg truncate">{nft.guide.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{nft.guide.email}</p>
                          
                          <div className="flex items-center text-xs text-gray-600 mb-3">
                            <span className="mr-1">Mint:</span>
                            <HoverCard>
                              <HoverCardTrigger>
                                <span className="truncate cursor-pointer text-blue-600 hover:text-blue-800">
                                  {shortenAddress(nft.mintAddress)}
                                </span>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">NFT Mint Address</p>
                                  <p className="text-xs break-all">{nft.mintAddress}</p>
                                  <a 
                                    href={`https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center mt-1"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <polyline points="15 3 21 3 21 9"></polyline>
                                      <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    View on Explorer
                                  </a>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Minted: {new Date(nft.mintedAt).toLocaleDateString()}
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <h4 className="text-xs font-medium uppercase text-gray-500 mb-1">Verification Info</h4>
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 w-24">Phone:</span>
                                <span className="text-xs">{nft.guide.phone}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 w-24">Affiliation:</span>
                                <span className="text-xs">{Object.keys(nft.guide.affiliationType)[0]}</span>
                              </div>
                              {nft.guide.affiliationType.agency && nft.guide.agencyName && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 w-24">Agency:</span>
                                  <span className="text-xs">{nft.guide.agencyName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            onClick={() => openGuideDetails(nft.guide)}
                          >
                            View Full Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={dialogOpen && selectedGuide} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Guide Verification Details</DialogTitle>
            <DialogDescription>
              Review detailed information for {selectedGuide?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGuide && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Personal Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Name</span>
                    <span className="block mt-1 text-sm text-gray-900">{selectedGuide.name}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">IC Number</span>
                    <span className="block mt-1 text-sm text-gray-900">{selectedGuide.icNumber}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Email</span>
                    <span className="block mt-1 text-sm text-gray-900">{selectedGuide.email}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Phone</span>
                    <span className="block mt-1 text-sm text-gray-900">{selectedGuide.phone}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Wallet Address</span>
                    <span className="block mt-1 text-sm text-gray-900 break-all">{selectedGuide.walletAddress}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Affiliation Type</span>
                    <span className="block mt-1 text-sm text-gray-900">
                      {selectedGuide.affiliationType?.freelance ? 'Freelance' : 
                       selectedGuide.affiliationType?.agency ? 'Agency' : 'Unknown'}
                    </span>
                  </div>
                  {selectedGuide.affiliationType?.agency && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Agency Name</span>
                      <span className="block mt-1 text-sm text-gray-900">{selectedGuide.agencyName}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Verification Documents</h4>
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-700">MOTAC License</span>
                    <a 
                      href={selectedGuide.licenseUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block mt-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View License Document
                    </a>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Photo ID</span>
                    <div className="mt-2">
                      {selectedGuide.photoIdUri && (
                        <div className="relative group">
                          <img 
                            src={selectedGuide.photoIdUri} 
                            alt="Photo ID" 
                            className="w-full max-w-xs rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                            onClick={() => window.open(selectedGuide.photoIdUri, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all duration-200 rounded-md">
                            <div className="opacity-0 group-hover:opacity-100 bg-white p-2 rounded-full shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 3 6 6m0 0-6 6m6-6H9"></path>
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                      <a 
                        href={selectedGuide.photoIdUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                        View Full Photo ID
                      </a>
                    </div>
                  </div>
                  {selectedGuide.attachmentUri && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Additional Attachment</span>
                      <a 
                        href={selectedGuide.attachmentUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                  {selectedGuide.affiliationType?.agency && selectedGuide.offerLetterUri && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Offer Letter</span>
                      <a 
                        href={selectedGuide.offerLetterUri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Offer Letter
                      </a>
                    </div>
                  )}
                  <div className="pt-4">
                    <span className="block text-sm font-medium text-gray-700">Current Status</span>
                    <Badge 
                      variant={
                        selectedGuide.status === 'pending' ? 'outline' : 
                        selectedGuide.status === 'approved' ? 'success' : 'destructive'
                      }
                      className="mt-1"
                    >
                      {selectedGuide.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Floating action buttons - only show for pending guides */}
          {selectedGuide && selectedGuide.status === 'pending' && (
            <div className="fixed bottom-20 right-8 z-50 flex gap-3">
              <Button 
                variant="destructive"
                size="lg"
                onClick={() => handleRejectGuide(selectedGuide)}
                disabled={actionInProgress}
                className="transition-all duration-300 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50"
              >
                {actionInProgress ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                    Reject Guide
                  </>
                )}
              </Button>
              <Button 
                variant="success"
                size="lg"
                onClick={() => handleApproveGuide(selectedGuide)}
                disabled={actionInProgress}
                className="transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50"
              >
                {actionInProgress ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Approve Guide
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Floating action button - mint NFT for approved guides */}
          {selectedGuide && selectedGuide.status === 'approved' && (
            <div className="fixed bottom-20 right-8 z-50 flex gap-3">
              <Button 
                variant="default"
                size="lg"
                onClick={() => mintNFT(selectedGuide)}
                disabled={actionInProgress || mintingNFT}
                className="transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50"
              >
                {mintingNFT ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Minting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    Mint Verification NFT
                  </>
                )}
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="transition-all duration-200 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-2 px-5 rounded-md hover:shadow-md"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 