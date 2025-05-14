'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS } from '@/lib/config';
import toast, { Toaster } from 'react-hot-toast';

// Import shadcn components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function VerifyPage() {
  const router = useRouter();
  const { publicKey, signTransaction } = useWallet();
  const [guideSubmissions, setGuideSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const ADMIN_WALLET = "GsjREUyUEkFRAhoSj1q9Tg4tPGCyoEAoTyFiZjqxKD92";
  
  // Use refs to store program-related objects
  const connectionRef = useRef(null);
  const providerRef = useRef(null);
  const programRef = useRef(null);
  const programIdRef = useRef(new anchor.web3.PublicKey(PROGRAM_ACCOUNT_ADDRESS));

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
    } else {
      providerRef.current = null;
      programRef.current = null;
    }
  }, [publicKey, signTransaction]);

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
    } else if (!publicKey) {
      setLoading(false);
    }
  }, [publicKey]);

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