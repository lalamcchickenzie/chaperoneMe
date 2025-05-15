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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PortfolioPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [formData, setFormData] = useState({
    ic: '',
    name: '',
    email: '',
    phone: '',
    motac: null,
    photoId: null,
    attachment: null,
    type: '',
    agencyName: '',
    offerLetter: null,
    walletAddress: publicKey ? publicKey.toString() : '',
  });

  // Update wallet address when publicKey changes
  useEffect(() => {
    if (publicKey) {
      setFormData(prevData => ({
        ...prevData,
        walletAddress: publicKey.toString(),
      }));
    }
  }, [publicKey]);

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
          
          setGuides(walletGuides);
        } catch (error) {
          console.error("Error fetching guide accounts:", error);
          toast.error("Failed to fetch blockchain data. Please try again later.");
          setError("Failed to fetch blockchain data");
        }
      } catch (error) {
        console.error("Error in portfolio page:", error);
        setError(error.message || "Failed to load portfolio data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, [publicKey, connected]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData({
      ...formData,
      [name]: files[0],
    });
  };

  const handleJoinClick = () => {
    if (publicKey) {
      setShowForm(true);
    } else {
      setShowWalletPrompt(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would implement the submission logic
    // For now just close the form
    setShowForm(false);
    toast.success('Form submitted! This is a placeholder.');
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

  // Show registration prompt if no NFTs found
  if (!loading && !error && guides.length === 0) {
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
              <CardTitle>No NFTs Found</CardTitle>
              <CardDescription>You don't have any verified guide NFTs linked to your wallet yet</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Image 
                src="/empty-state.svg" 
                alt="No NFTs Found" 
                width={120} 
                height={120}
                className="mb-6 opacity-70"
              />
              <p className="text-center text-gray-600 mb-6">
                Register as a verified tour guide to receive your NFT credential.
              </p>
              <Button className="w-full" onClick={handleJoinClick}>Register as a Guide</Button>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Connection Prompt */}
        <Dialog open={showWalletPrompt} onOpenChange={setShowWalletPrompt}>
          <DialogContent className="bg-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">Connect Wallet</DialogTitle>
              <DialogDescription className="text-gray-700">
                Please connect your wallet to proceed with the verification process.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <p className="text-sm text-gray-500 italic">
                Use the wallet button in the navigation bar to connect
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Registration Form Popup */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2E3A50] rounded-xl shadow-2xl relative max-w-md w-full overflow-y-auto max-h-[90vh]">
              <div className="p-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                
                <h2 className="text-white text-2xl font-bold mb-6 text-center">Tour Guide Verification</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="ic" className="block text-gray-300 text-sm font-medium">IC Number</label>
                    <input
                      id="ic"
                      type="text"
                      name="ic"
                      placeholder="Enter your IC number"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.ic}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-gray-300 text-sm font-medium">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-gray-300 text-sm font-medium">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-gray-300 text-sm font-medium">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      placeholder="Enter your phone number"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="motac" className="block text-gray-300 text-sm font-medium">Tour Guide's License (PDF only)</label>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="motac" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                        </div>
                        <input 
                          id="motac" 
                          type="file" 
                          name="motac" 
                          className="hidden" 
                          accept="application/pdf"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                    </div>
                    {formData.motac && (
                      <p className="text-xs text-green-400 mt-1">File selected: {formData.motac.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="photoId" className="block text-gray-300 text-sm font-medium">Photo ID</label>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="photoId" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10MB)</p>
                        </div>
                        <input 
                          id="photoId" 
                          type="file" 
                          name="photoId" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                    </div>
                    {formData.photoId && (
                      <p className="text-xs text-green-400 mt-1">File selected: {formData.photoId.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="attachment" className="block text-gray-300 text-sm font-medium">Additional Attachment (Optional)</label>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="attachment" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">Any file type (MAX. 10MB)</p>
                        </div>
                        <input 
                          id="attachment" 
                          type="file" 
                          name="attachment" 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                      </label>
                    </div>
                    {formData.attachment && (
                      <p className="text-xs text-green-400 mt-1">File selected: {formData.attachment.name}</p>
                    )}
                  </div>
                  
                  <fieldset className="space-y-2">
                    <legend className="text-gray-300 text-sm font-medium">Affiliation</legend>
                    <div className="flex space-x-6">
                      <div className="flex items-center">
                        <input
                          id="agency"
                          type="radio"
                          name="type"
                          value="agency"
                          checked={formData.type === 'agency'}
                          onChange={handleChange}
                          required
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="agency" className="ml-2 block text-sm text-gray-300">
                          Travel Agency
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="freelance"
                          type="radio"
                          name="type"
                          value="freelance"
                          checked={formData.type === 'freelance'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="freelance" className="ml-2 block text-sm text-gray-300">
                          Freelance
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  
                  {formData.type === 'agency' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="agencyName" className="block text-gray-300 text-sm font-medium">Agency Name</label>
                        <input
                          id="agencyName"
                          type="text"
                          name="agencyName"
                          placeholder="Enter your agency name"
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={formData.agencyName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="offerLetter" className="block text-gray-300 text-sm font-medium">Offer Letter</label>
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="offerLetter" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                              </svg>
                              <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500">PDF or image (MAX. 10MB)</p>
                            </div>
                            <input 
                              id="offerLetter" 
                              type="file" 
                              name="offerLetter" 
                              className="hidden" 
                              accept="application/pdf,image/*"
                              onChange={handleFileChange}
                              required
                            />
                          </label>
                        </div>
                        {formData.offerLetter && (
                          <p className="text-xs text-green-400 mt-1">File selected: {formData.offerLetter.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="walletAddress" className="block text-gray-300 text-sm font-medium">Wallet Address</label>
                    <input
                      id="walletAddress"
                      type="text"
                      name="walletAddress"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-300 cursor-not-allowed"
                      value={formData.walletAddress}
                      readOnly
                    />
                    <p className="text-xs text-gray-400 mt-1">Address automatically captured from your connected wallet</p>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Submit Verification Request
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
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