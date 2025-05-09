'use client';
import { QRCodeSVG } from 'qrcode.react';

const QRCode = ({ value }) => {
  return (
    <div className="flex justify-center items-center p-4 bg-white rounded-lg">
      <QRCodeSVG
        value={value || "https://chaperoneme.com/verify"}
        size={200}
        level="H"
        includeMargin={true}
        className="w-full h-full"
      />
    </div>
  );
};

export default QRCode; 