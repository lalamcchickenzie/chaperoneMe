'use client';
import { useState } from 'react';
import StampCard from '../../components/StampCard';

export default function StampPage() {
  const [showConnected, setShowConnected] = useState(false);
  
  return (

      <div className="min-h-screen bg-gray-100">
        
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-mono font-bold text-center text-gray-800 mb-8">
              Tour Guide License
            </h1>
            <StampCard 
              guideName="Michael B. Jordan"
              guideImage="/download.jpeg"
            />
            <p className="text-center text-gray-600 mt-4">
              Click the card to flip and view the verification QR code
            </p>
          </div>
        </div>
      </div>

  );
} 