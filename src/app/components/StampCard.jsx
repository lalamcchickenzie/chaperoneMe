'use client';

import { useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode.react';

export default function StampCard({ guideName, qrValue }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`stamp-flip-container${flipped ? ' flipped' : ''}`}
      onClick={() => setFlipped(!flipped)}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <div className="stamp-flip-inner">
        {/* Front */}
        <div className="stamp-flip-front">
          <div className="stamp-card-content">
            <Image
              src="/download.jpeg"
              alt="Tour Guide"
              width={180}
              height={180}
              className="stamp-guide-img"
            />
            <div className="stamp-guide-name">{guideName}</div>
            <div className="stamp-brand">CHAPERONEME</div>
          </div>
        </div>
        {/* Back */}
        <div className="stamp-flip-back">
          <div className="stamp-card-content flex-center" style={{height:'100%'}}>
            <QRCode value={qrValue} size={140} bgColor="#E6E0D5" fgColor="#1B1B1B" level="H" includeMargin={true} />
            <div className="stamp-verify-label">VERIFIED GUIDE</div>
          </div>
        </div>
      </div>
    </div>
  );
} 