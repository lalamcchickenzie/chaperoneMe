'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import StampCard from './components/StampCard';
import Navbar from './components/Navbar';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import toast, { Toaster } from 'react-hot-toast';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS } from '@/lib/config';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
// Main component that directly uses wallet context now
export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uploadProgress, setUploadProgress] = useState({
    license: 0,
    photoId: 0,
    attachment: 0,
    offerLetter: 0,
  });
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // idle, uploading, submitting, success, error
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
    walletAddress: '',
  });
  const [transactionHash, setTransactionHash] = useState('');

  // Create a connection and provider
  const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));
  const provider = publicKey && signTransaction ? new anchor.AnchorProvider(
    connection,
    {
      publicKey,
      signTransaction,
      signAllTransactions: async (txs) => {
        return await Promise.all(txs.map(tx => signTransaction(tx)));
      },
    },
    { commitment: 'confirmed' }
  ) : null;

  // If provider exists, set it as the global provider
  if (provider) {
    anchor.setProvider(provider);
  }

  // Initialize the program with IDL
  const programId = new anchor.web3.PublicKey(PROGRAM_ACCOUNT_ADDRESS);
  const program = provider ? new anchor.Program(programIDL, provider) : null;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update wallet address when publicKey changes
  useEffect(() => {
    if (publicKey) {
      setFormData(prevData => ({
        ...prevData,
        walletAddress: publicKey.toString(),
      }));
    }
  }, [publicKey]);

  // Add event listener for openJoinForm event
  useEffect(() => {
    const handleOpenJoinForm = () => {
      setShowForm(true);
    };
    
    window.addEventListener('openJoinForm', handleOpenJoinForm);
    
    return () => {
      window.removeEventListener('openJoinForm', handleOpenJoinForm);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  };

  const uploadFileToIPFS = async (file) => {
    try {
      // Convert file to form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload file to IPFS via Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      console.log('File upload response:', data);
      
      return `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const createMetadataAndUploadToIPFS = async (fileUrl, name, description) => {
    const metadata = {
      name: name,
      description: description || `Document for ${name}`,
      image: fileUrl,
      attributes: [
        {
          trait_type: "Created By",
          value: publicKey?.toString().slice(0, 8) + "..." || "Unknown"
        }
      ]
    };

    try {
      // Upload metadata to IPFS via Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: JSON.stringify(metadata),
      });
      
      const data = await response.json();
      console.log('Metadata upload response:', data);
      
      return `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading metadata:', error);
      throw error;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if wallet is connected
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet to submit verification.');
      return;
    }
    
    setShowForm(false); // Hide form immediately for better UX
    
    // Create notification for the entire submission process
    const submissionToast = toast.loading(
      'Starting submission process...',
      { duration: Infinity }
    );
    
    // Upload files and submit to Solana program
    const processVerification = async () => {
      try {
        // Validate form data before proceeding
        if (!formData.ic || !formData.name || !formData.email || !formData.phone) {
          throw new Error("Please fill all required fields");
        }
        
        if (!formData.motac || !formData.photoId) {
          throw new Error("License and Photo ID are required");
        }
        
        if (formData.type === 'agency' && (!formData.agencyName || !formData.offerLetter)) {
          throw new Error("Agency name and offer letter are required for agency affiliation");
        }
        
        setSubmissionStatus('uploading');
        toast.loading('Preparing files for upload...', {
          id: submissionToast
        });
        
        // Upload license (MOTAC) to IPFS
        let licenseUri = '';
        if (formData.motac) {
          toast.loading('Uploading license (1/4)...', {
            id: submissionToast
          });
          
          const formDataFile = new FormData();
          formDataFile.append('file', formData.motac);
          
          setUploadProgress(prev => ({ ...prev, license: 10 }));
          
          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
            body: formDataFile,
          });
          
          setUploadProgress(prev => ({ ...prev, license: 100 }));
          const data = await response.json();
          licenseUri = `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
          
          toast.loading('License uploaded successfully!', {
            id: submissionToast
          });
        }
        
        // Upload photo ID to IPFS
        let photoIdUri = '';
        if (formData.photoId) {
          toast.loading('Uploading photo ID (2/4)...', {
            id: submissionToast
          });
          
          const formDataFile = new FormData();
          formDataFile.append('file', formData.photoId);
          
          setUploadProgress(prev => ({ ...prev, photoId: 10 }));
          
          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
            body: formDataFile,
          });
          
          setUploadProgress(prev => ({ ...prev, photoId: 100 }));
          const data = await response.json();
          photoIdUri = `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
          
          toast.loading('Photo ID uploaded successfully!', {
            id: submissionToast
          });
        }
        
        // Upload attachment to IPFS (optional)
        let attachmentUri = null;
        if (formData.attachment) {
          toast.loading('Uploading attachment (3/4)...', {
            id: submissionToast
          });
          
          const formDataFile = new FormData();
          formDataFile.append('file', formData.attachment);
          
          setUploadProgress(prev => ({ ...prev, attachment: 10 }));
          
          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
            body: formDataFile,
          });
          
          setUploadProgress(prev => ({ ...prev, attachment: 100 }));
          const data = await response.json();
          attachmentUri = `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
          
          toast.loading('Attachment uploaded successfully!', {
            id: submissionToast
          });
        }
        
        // Upload offer letter to IPFS (if agency type)
        let offerLetterUri = null;
        if (formData.type === 'agency' && formData.offerLetter) {
          toast.loading('Uploading offer letter (4/4)...', {
            id: submissionToast
          });
          
          const formDataFile = new FormData();
          formDataFile.append('file', formData.offerLetter);
          
          setUploadProgress(prev => ({ ...prev, offerLetter: 10 }));
          
          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
            body: formDataFile,
          });
          
          setUploadProgress(prev => ({ ...prev, offerLetter: 100 }));
          const data = await response.json();
          offerLetterUri = `https://plum-tough-mongoose-147.mypinata.cloud/ipfs/${data.IpfsHash}`;
          
          toast.loading('Offer letter uploaded successfully!', {
            id: submissionToast
          });
        }
        
        // All files uploaded, prepare for blockchain submission
        toast.loading('All files uploaded. Preparing transaction...', {
          id: submissionToast
        });
        
        // Prepare data for Solana program according to contract parameters
        const submissionData = {
          ic_number: formData.ic,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          wallet_address: formData.walletAddress,
          license_uri: licenseUri,
          photo_id_uri: photoIdUri,
          attachment_uri: attachmentUri,
          affiliation_type: formData.type === 'agency' ? { agency: {} } : { freelance: {} },
          agency_name: formData.type === 'agency' ? formData.agencyName : null,
          offer_letter_uri: offerLetterUri,
        };
        
        console.log("Submission data prepared:", submissionData);
        
        setSubmissionStatus('submitting');
        toast.loading('Submitting verification to blockchain...', {
          id: submissionToast
        });
        
        if (!program) {
          throw new Error("Program not initialized. Please connect your wallet.");
        }
        
        // Derive the admin account PDA
        const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("admin")],
          programId
        );
        
        console.log("Admin account PDA:", adminAccount.toString());
        
        // First fetch the admin account to get the current guides count
        const adminAccountInfo = await program.account.adminAccount.fetch(adminAccount);
        console.log("Admin account info:", adminAccountInfo);
        console.log("Current guides count:", adminAccountInfo.guidesCount.toString());
        
        const [guideAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("guide"), 
            publicKey.toBuffer(), 
            new BN(adminAccountInfo.guidesCount).toArrayLike(Buffer, 'le', 8)
          ],
          programId
        );
        
        console.log("Guide account PDA:", guideAccount.toString());
        
        // Build the transaction instead of directly sending it
        const transaction = await program.methods
          .submitVerification(
            submissionData.ic_number,
            submissionData.name,
            submissionData.email,
            submissionData.phone,
            submissionData.wallet_address,
            submissionData.license_uri,
            submissionData.photo_id_uri,
            submissionData.attachment_uri,
            submissionData.affiliation_type,
            submissionData.agency_name,
            submissionData.offer_letter_uri
          )
          .accounts({
            guideAccount: guideAccount,
            adminAccount: adminAccount,
            authority: publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction();
        
        // Get a recent blockhash
        let retries = 3;
        let txSignature = '';
        
        while (retries > 0) {
          try {
            toast.loading(`Attempting to submit transaction (${4-retries}/3)...`, {
              id: submissionToast
            });
            
            // Get a fresh blockhash for each attempt
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
            
            console.log("Transaction built with blockhash:", blockhash);
            
            // Sign the transaction with the user's wallet
            const signedTransaction = await signTransaction(transaction);
            console.log("Transaction signed by user");
            
            // Send the signed transaction
            txSignature = await connection.sendRawTransaction(
              signedTransaction.serialize(),
              { skipPreflight: false, preflightCommitment: 'confirmed' }
            );
            console.log("Transaction submitted with signature:", txSignature);
            
            // Store transaction hash
            setTransactionHash(txSignature);
            
            // Wait for confirmation
            console.log("Waiting for transaction confirmation...");
            const confirmationStatus = await connection.confirmTransaction({
              blockhash,
              lastValidBlockHeight,
              signature: txSignature
            }, 'confirmed');
            
            if (confirmationStatus.value.err) {
              throw new Error(`Transaction confirmed with error: ${confirmationStatus.value.err}`);
            }
            
            console.log("Transaction confirmed successfully");
            
            // Success notification
            setSubmissionStatus('success');
            toast.success('Verification submitted successfully! Your application is now under review.', {
              id: submissionToast,
              duration: 5000
            });
            
            // Exit the retry loop on success
            break;
          } catch (error) {
            console.error(`Transaction attempt ${4-retries}/3 failed:`, error);
            
            if (retries > 1 && (
              error.message.includes('Blockhash not found') || 
              error.message.includes('block height exceeded') ||
              error.name === 'SendTransactionError'
            )) {
              console.log("Retrying transaction with fresh blockhash...");
              retries--;
              // Small delay before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              // No more retries or different error - throw to outer catch
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('Error during verification submission:', error);
        setSubmissionStatus('error');
        
        // Provide more specific error messages based on the type of error
        let errorMessage = error.message || 'Failed to upload files or submit verification';
        
        if (error.name === 'SendTransactionError') {
          try {
            // Try to extract logs if available
            const logs = error.logs || [];
            errorMessage = `Transaction failed: ${error.message}`;
            console.error('Full error logs:', logs);
            
            // Add logs to error message if they exist
            if (logs && logs.length > 0) {
              errorMessage += `. Details: ${logs.join(', ')}`;
            }
          } catch (logError) {
            errorMessage = `Transaction failed: ${error.message}`;
          }
        } else if (errorMessage.includes('User rejected')) {
          errorMessage = 'Transaction was rejected in your wallet.';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Your wallet has insufficient funds to complete this transaction.';
        } else if (error.name === 'ProgramError') {
          errorMessage = `Solana program error: ${error.msg || error.message}`;
        } else if (errorMessage.includes('Blockhash not found')) {
          errorMessage = 'Transaction timeout: blockhash expired. Please try again.';
        }
        
        toast.error(`Error: ${errorMessage}`, {
          id: submissionToast,
          duration: 5000
        });
      } finally {
        // Reset progress
        setTimeout(() => {
          setUploadProgress({
            license: 0,
            photoId: 0,
            attachment: 0,
            offerLetter: 0,
          });
          setSubmissionStatus('idle');
        }, 5000);
      }
    };
    
    // Start the process
    processVerification();
  };

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

  return (
    <main className="min-h-screen">
      {/* Toast Container for Notifications */}
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          className: 'react-hot-toast',
          style: {
            color: '#000000',
            fontWeight: 'medium',
          },
          success: {
            style: {
              background: '#ECFDF5',
              border: '1px solid #10B981',
              color: '#000000',
            },
          },
          error: {
            style: {
              background: '#FEF2F2',
              border: '1px solid #EF4444',
              color: '#000000',
            },
          },
          loading: {
            style: {
              background: '#EFF6FF',
              border: '1px solid #3B82F6',
              color: '#000000',
            },
          },
        }} 
      />
      
      {/* Show Progress Modal if uploading or submitting */}
      {(submissionStatus === 'uploading' || submissionStatus === 'submitting') && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-center mb-6 text-black">
              {submissionStatus === 'uploading' ? 'Uploading Files' : 'Submitting to Blockchain'}
            </h2>
            
            {formData.motac && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-black">MOTAC License</span>
                  <span className="text-sm font-medium text-black">{uploadProgress.license}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${uploadProgress.license}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {formData.photoId && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-black">Photo ID</span>
                  <span className="text-sm font-medium text-black">{uploadProgress.photoId}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${uploadProgress.photoId}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {formData.attachment && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-black">Attachment</span>
                  <span className="text-sm font-medium text-black">{uploadProgress.attachment}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${uploadProgress.attachment}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {formData.type === 'agency' && formData.offerLetter && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-black">Offer Letter</span>
                  <span className="text-sm font-medium text-black">{uploadProgress.offerLetter}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${uploadProgress.offerLetter}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {submissionStatus === 'submitting' && (
              <div className="mt-6 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-black">
                  Submitting your application to the blockchain. This may take a moment...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show Success Modal if verification successful */}
      {submissionStatus === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-black">Verification Submitted!</h3>
              <p className="mt-2 text-sm text-black">
                Your application has been submitted successfully. Our team will review your documents and update you on the status.
              </p>
              
              {transactionHash && (
                <div className="mt-4 border border-gray-200 rounded-md p-3 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                  <div className="flex items-center">
                    <p className="text-xs font-mono text-gray-800 truncate max-w-[200px]">
                      {transactionHash}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(transactionHash);
                        toast.success("Transaction hash copied to clipboard!");
                      }}
                      className="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                  <a 
                    href={`https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 inline-flex items-center"
                  >
                    View on Solana Explorer
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
              
              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none"
                  onClick={() => setSubmissionStatus('idle')}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticker Bar */}
      <div className="ticker-bar-wrapper overflow-hidden whitespace-nowrap bg-[#E6E0D5]">
        <div className="ticker-bar-inner inline-block animate-ticker">
          {Array.from({ length: 8 }).map((_, i) => (
            <span className="mx-8" key={i}>
              {formatDay(currentTime)} | DO YOU NOT NEED A CHAPERONE? CHAPERONEME IS HERE. | {formatTime(currentTime)}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#2E3A50] p-8">
        {/* Stamps Display */}
        <div className="stamp-container">
          <div className="stamp-left">
            <Image
              src="/Stamp_Malaya_1905_8c (1).jpg"
              alt="Left Stamp"
              width={200}
              height={200}
              className="stamp"
            />
          </div>
          <div>
            <Image
              src="/Stamp_Malaya_1905_8c (1).jpg"
              alt="Center Stamp"
              width={300}
              height={300}
              className="stamp"
            />
          </div>
          <div className="stamp-right">
            <Image
              src="/Stamp_Malaya_1905_8c (1).jpg"
              alt="Right Stamp"
              width={200}
              height={200}
              className="stamp"
            />
          </div>
        </div>

        {/* Tagline */}
        <h1 className="text-center text-white text-2xl font-mono mt-8">
          CHAPERONEME: DO NOT FRET, YOU GET VERIFIED!
        </h1>
      </div>

      {/* Tour Guide License Section */}
      <div className="bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-mono font-bold text-center text-gray-800 mb-8">
            Tour Guide License
          </h2>
          <StampCard 
            guideName="Michael B. Jordan"
            guideImage="/download.jpeg"
          />
          <p className="text-center text-gray-600 mt-4">
            Click the card to authenticate
          </p>
        </div>
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
            <WalletMultiButton className="wallet-adapter-button" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup Form */}
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

      {/* About Us Section */}
      <section id="about-us" className="max-w-3xl mx-auto my-16 px-4 py-4 bg-white bg-opacity-90 rounded-xl shadow-md">
        <h2 className="text-2xl font-mono font-bold text-center text-blue-700 mb-4">About Us</h2>
        <p className="font-baskerville text-xs text-gray-800 mb-2 text-justify">
          At ChaperoneMe, we believe that every journey should be safe, enriching, and worry-free. Our mission is to empower travelers by connecting them with thoroughly vetted, passionate local guides who bring destinations to life with authenticity and expertise.
        </p>
        <p className="font-baskerville text-xs text-gray-700 mb-2 text-justify">
          We understand that exploring new places can be daunting, especially when it comes to trust and safety. That's why our platform leverages digital ID verification, transparent ratings, and real-time credentials, ensuring that every guide you meet is both qualified and trustworthy.
        </p>
        <p className="font-baskerville text-xs text-gray-700 mb-2 text-justify">
          Whether you're seeking a private tour, joining a group adventure, or simply looking for local insights, ChaperoneMe is your partner in creating memorable, secure travel experiences. Let us handle the logistics—so you can focus on discovery, connection, and adventure.
        </p>
        <p className="font-baskerville text-xs text-gray-900 font-semibold text-center mt-4">
          Your journey, our commitment: safe, authentic travel—anywhere in the world.
        </p>
      </section>

      {/* Twitter/X Social Media Link */}
      <div className="flex flex-col items-center mt-12 mb-4">
        <a
          href="https://x.com/chaperoneTeam"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center text-gray-700 hover:text-blue-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <path d="M22.162 5.656c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.962-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 11.07 9.03c0 .352.04.695.116 1.022C7.728 9.89 4.768 8.2 2.743 5.74a4.48 4.48 0 0 0-.607 2.254c0 1.555.792 2.927 2.002 3.732a4.48 4.48 0 0 1-2.03-.56v.057a4.48 4.48 0 0 0 3.6 4.393c-.193.053-.397.08-.607.08-.148 0-.292-.014-.432-.04a4.48 4.48 0 0 0 4.18 3.11A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.017c8.26 0 12.78-6.84 12.78-12.78 0-.195-.004-.39-.013-.583a9.14 9.14 0 0 0 2.24-2.338z" />
          </svg>
          <span className="text-sm font-mono">Follow us on X (Twitter)</span>
          <span className="text-xs text-gray-400">@chaperoneTeam</span>
        </a>
      </div>
    </main>
  );
} 