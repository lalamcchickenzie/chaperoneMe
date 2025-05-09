'use client';

import { useState } from 'react';
import Image from 'next/image';
import QRCode from './QRCode';

const StampCard = ({ guideName, guideImage }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <div 
        className={`relative w-full h-[500px] transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of the card */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="w-full h-full bg-white rounded-xl shadow-xl overflow-hidden border-4" style={{ borderColor: 'var(--brand-color)' }}>
            <div className="relative h-2/3">
              <Image
                src={guideImage || "/download.jpeg"}
                alt={guideName}
                fill
                className="object-cover"
                objectPosition="center top"
              />
            </div>
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{guideName}</h2>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-blue-600 font-semibold">ChaperoneMe</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">Licensed Tour Guide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of the card */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div className="w-full h-full bg-white rounded-xl shadow-xl overflow-hidden border-4 p-6" style={{ borderColor: 'var(--brand-color)' }}>
            <div className="flex flex-col items-center justify-center h-full">
              <h3 className="text-2xl font-mono font-bold text-gray-800 mb-4">
                Verify License
              </h3>
              <QRCode />
              <p className="mt-4 text-sm text-gray-600 text-center">
                Scan to verify this tour guide's license
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StampCard; 