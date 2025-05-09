'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

export default function StampCard({ guideName, guideImage, verificationUrl }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-[300px] h-[400px] perspective-1000">
      <div
        className={`w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of the card */}
        <div className="absolute w-full h-full backface-hidden bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
          <div className="relative w-48 h-48 mb-4 rounded-full overflow-hidden">
            <Image
              src={guideImage}
              alt={guideName}
              fill
              className="object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{guideName}</h2>
          <div className="mt-4 text-center">
            <p className="text-xl font-semibold text-blue-600">CHAPERONEME</p>
            <p className="text-sm text-gray-600 mt-1">Licensed Tour Guide</p>
          </div>
        </div>

        {/* Back of the card */}
        <div className="absolute w-full h-full backface-hidden bg-white rounded-lg shadow-xl p-6 flex flex-col items-center justify-center rotate-y-180">
          <div className="mb-4">
            <QRCodeSVG
              value={verificationUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-sm text-gray-600 mt-4">Scan to verify authenticity</p>
        </div>
      </div>
    </div>
  );
} 