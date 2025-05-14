"use client";

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import * as anchor from '@coral-xyz/anchor';// Changed import to @project-serum-anchor
import { useRouter } from 'next/navigation';
import programIDL from '@/contract/idl.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Info } from "lucide-react";
import { PROGRAM_ACCOUNT_ADDRESS } from '@/lib/config';

const PROGRAM_ID = new PublicKey(PROGRAM_ACCOUNT_ADDRESS);
const AUTHORIZED_WALLET = 'GsjREUyUEkFRAhoSj1q9Tg4tPGCyoEAoTyFiZjqxKD92';

const Initialize = () => {
  const { publicKey, signTransaction } = useWallet();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (publicKey) {
      const walletAddress = publicKey.toString();
      if (walletAddress !== AUTHORIZED_WALLET) {
        toast({
          title: "Access Denied",
          description: "You are not authorized to access this page.",
          variant: "destructive",
        });
        router.push('/');
      } else {
        setIsAuthorized(true);
        checkIfInitialized();
      }
    } else {
      setIsAuthorized(false);
      setIsInitialized(false);
      setIsChecking(true);
    }
  }, [publicKey, router, toast]);

  const checkIfInitialized = async () => {
    try {
      setIsChecking(true);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Derive the admin account PDA
      const [adminAccount] = await PublicKey.findProgramAddressSync(
        [Buffer.from("admin")],
        PROGRAM_ID
      );

      // Check if the account exists
      const accountInfo = await connection.getAccountInfo(adminAccount);
      setIsInitialized(accountInfo !== null);
    } catch (error) {
      console.error("Error checking initialization status:", error);
      setIsInitialized(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInitialize = async () => {
    if (!publicKey || !signTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to initialize the admin account",
        variant: "destructive",
      });
      return;
    }

    if (publicKey.toString() !== AUTHORIZED_WALLET) {
      toast({
        title: "Unauthorized",
        description: "Only the authorized admin wallet can initialize the contract",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsInitializing(true);

      // Connect to the Solana network
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

      // Load the IDL (Interface Description Language) for your program
      // Note: In a real app, you would load this from your build output
      const idl = programIDL;

      if (!idl) {
        throw new Error("Failed to fetch program IDL");
      }

      // Create a program instance
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs) => {
            if (!signTransaction) return txs;
            return await Promise.all(txs.map(tx => signTransaction(tx)));
          },
        },
        { commitment: 'confirmed' }
      );

      anchor.setProvider(provider);
      const program = new anchor.Program(idl, provider); // Added the provider here

      // Derive the admin account PDA
      const [adminAccount, bump] = await PublicKey.findProgramAddressSync(
        [Buffer.from("admin")],
        PROGRAM_ID
      );

      // Call the initialize instruction
      const tx = await program.methods
        .initialize()
        .accounts({
          adminAccount,
          authority: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      // Get a recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Sign and send the transaction
      const signedTx = await signTransaction(tx);
      const txId = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(
        {
          blockhash: (await connection.getLatestBlockhash()).blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
          signature: txId,
        },
        'confirmed'
      );

      toast({
        title: "Initialization successful",
        description: "The admin account has been initialized",
      });

    } catch (error) {
      console.error("Initialization error:", error);
      toast({
        title: "Initialization failed",
        description: error.message || "Failed to initialize admin account",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin Authorization Required</CardTitle>
            <CardDescription>
              Connect your wallet to access the admin initialization page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <WalletMultiButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (publicKey && !isAuthorized) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You are not authorized to access this page. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Initialize Admin Account</CardTitle>
          <CardDescription>
            Create the admin account that will manage guide verifications in the ChaperoneMe program.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> This action will initialize the admin account on the Solana blockchain.
                The wallet you use to sign this transaction will become the admin authority and have permission to
                approve or reject guide verifications.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium">Admin Wallet</p>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-2 bg-gray-100 rounded-md text-sm truncate w-full">
                  {publicKey.toString()}
                </span>
              </div>
              <p className="text-xs text-green-600 font-medium">✓ Authorized Admin Wallet</p>
            </div>

            {isChecking ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse">Checking initialization status...</div>
              </div>
            ) : isInitialized ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Admin Account Initialized</AlertTitle>
                <AlertDescription className="text-green-700">
                  The admin account has already been initialized on the blockchain.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Initialization Required</AlertTitle>
                <AlertDescription className="text-blue-700">
                  The admin account needs to be initialized to manage guide verifications.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>

        <CardFooter>
          {!isInitialized && (
            <Button
              className="w-full"
              disabled={!isAuthorized || isInitializing || isChecking}
              onClick={handleInitialize}
            >
              {isInitializing ? "Initializing..." : "Initialize Admin Account"}
            </Button>
          )}
          {isInitialized && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push('/')}
            >
              Return to Homepage
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Initialize;