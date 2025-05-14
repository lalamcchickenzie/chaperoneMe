'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StampCard from '../components/StampCard';
import * as anchor from '@coral-xyz/anchor';
import programIDL from '@/contract/idl.json';
import { PROGRAM_ACCOUNT_ADDRESS } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function GuidesPage() {
  const router = useRouter();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuides = async () => {
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
        
        // Find the admin account PDA
        const [adminAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("admin")],
          programId
        );
        
        try {
          // Fetch the admin account data
          const adminAccountInfo = await program.account.adminAccount.fetch(adminAccount);
          
          // Fetch all guide accounts
          const allGuideAccounts = await program.account.guideAccount.all();
          
          // Filter only approved guides
          const approvedGuides = allGuideAccounts
            .filter(account => Object.keys(account.account.status)[0] === 'approved')
            .map(account => ({
              ...account.account,
              publicKey: account.publicKey.toString(),
              status: Object.keys(account.account.status)[0],
              affiliationType: Object.keys(account.account.affiliationType)[0],
              authority: account.account.authority.toString(),
              index: account.account.index.toNumber(),
              id: `${account.account.authority.toString()}-${account.account.index.toNumber()}`
            }));
          
          setGuides(approvedGuides);
        } catch (error) {
          console.error("Error fetching guide accounts:", error);
          
          // If we can't fetch from blockchain, use mock data
          setGuides([
            {
              id: 'demo1-0',
              name: "John Doe",
              email: "john@example.com",
              phone: "555-123-4567",
              photoIdUri: "/download.jpeg",
              status: "approved",
              affiliationType: "freelance"
            },
            {
              id: 'demo2-1',
              name: "Jane Smith",
              email: "jane@example.com",
              phone: "555-987-6543",
              photoIdUri: "/download.jpeg",
              status: "approved",
              affiliationType: "agency",
              agencyName: "Best Tours Inc."
            },
            {
              id: 'demo3-2',
              name: "Ahmed Ali",
              email: "ahmed@example.com",
              phone: "555-222-3333",
              photoIdUri: "/download.jpeg",
              status: "approved",
              affiliationType: "freelance"
            }
          ]);
        }
      } catch (error) {
        console.error("Error in guides page:", error);
        setError(error.message || "Failed to load guide data");
        
        // Use mock data as fallback
        setGuides([
          {
            id: 'demo1-0',
            name: "John Doe",
            email: "john@example.com",
            phone: "555-123-4567",
            photoIdUri: "/download.jpeg",
            status: "approved",
            affiliationType: "freelance"
          },
          {
            id: 'demo2-1',
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "555-987-6543",
            photoIdUri: "/download.jpeg",
            status: "approved",
            affiliationType: "agency",
            agencyName: "Best Tours Inc."
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuides();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Verified Tour Guides</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our verified tour guides below. Each guide's license can be verified by scanning their QR code.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Error Loading Guides</CardTitle>
              <CardDescription>We encountered a problem loading the guide data</CardDescription>
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
        ) : guides.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No verified guides found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map((guide) => (
              <div key={guide.id} className="flex flex-col items-center">
                <Link href={`/guides/${guide.id}`} className="block w-full max-w-xs">
                  <StampCard 
                    guideName={guide.name}
                    guideImage={guide.photoIdUri}
                    qrValue={`https://chaperoneme.com/guides/${guide.id}`}
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
        )}
      </div>
    </div>
  );
} 