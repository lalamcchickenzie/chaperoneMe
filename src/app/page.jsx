'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import StampCard from './components/StampCard';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletProvider } from './components/wallet-provider'; // call dekat sini
import { useWallet } from '@solana/wallet-adapter-react';

// Wrap component to access useWallet hook
function HomeContent() {
  const { publicKey } = useWallet();
  const [showForm, setShowForm] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    ic: '',
    name: '',
    email: '',
    phone: '',
    motac: null,
    attachment: null,
    type: '',
    agencyName: '',
    offerLetter: null,
    walletAddress: '',
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
    setShowForm(false); // Close the popup after submission
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
      {/* Navigation */}
      <nav className="flex justify-between items-center p-4 bg-[#1A2A3A]">
        <div className="flex items-center space-x-4">
          <a href="/" className="nav-link">HOME</a>
          <a href="#about-us" className="nav-link">ABOUT US</a>
          <a href="#" className="nav-link" onClick={handleJoinClick}>JOIN US TODAY</a>
        </div>
        <div className="wallet-adapter-dropdown">
          <WalletMultiButton className="wallet-adapter-button" />
        </div>
        
      </nav>

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
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Connect Wallet</h2>
              <button 
                onClick={() => setShowWalletPrompt(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-6">Please connect your wallet to proceed with the verification process.</p>
            <div className="flex justify-center">
              <WalletMultiButton className="wallet-adapter-button" />
            </div>
          </div>
        </div>
      )}

      {/* Popup Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="verification-form relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              ✕
            </button>
            <h2 className="text-white text-xl mb-4 text-center">JOIN US TODAY</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="ic"
                placeholder="IC Number"
                className="form-input"
                value={formData.ic}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              <label className="block text-white mb-1 mt-2">Upload tour guide's license (PDF only)</label>
              <input
                type="file"
                name="motac"
                accept="application/pdf"
                className="form-input"
                onChange={handleFileChange}
                required
              />
              <label className="block text-white mb-1 mt-2">Additional Attachment</label>
              <input
                type="file"
                name="attachment"
                className="form-input"
                onChange={handleFileChange}
              />
              <div className="mt-4 mb-2">
                <label className="text-white mr-4">Affiliation:</label>
                <label className="mr-2">
                  <input
                    type="radio"
                    name="type"
                    value="agency"
                    checked={formData.type === 'agency'}
                    onChange={handleChange}
                    required
                  /> Travel Agency
                </label>
                <label>
                  <input
                    type="radio"
                    name="type"
                    value="freelance"
                    checked={formData.type === 'freelance'}
                    onChange={handleChange}
                  /> Freelance
                </label>
              </div>
              {formData.type === 'agency' && (
                <>
                  <input
                    type="text"
                    name="agencyName"
                    placeholder="Agency Name"
                    className="form-input"
                    value={formData.agencyName}
                    onChange={handleChange}
                    required
                  />
                  <label className="block text-white mb-1 mt-2">Upload Offer Letter</label>
                  <input
                    type="file"
                    name="offerLetter"
                    className="form-input"
                    onChange={handleFileChange}
                    required
                  />
                </>
              )}
              <div className="mt-2">
                <label className="block text-white mb-1">Wallet Address</label>
                <input
                  type="text"
                  name="walletAddress"
                  className="form-input bg-gray-100"
                  value={formData.walletAddress}
                  readOnly
                />
                <p className="text-xs text-gray-300 mt-1">Address automatically captured from your connected wallet</p>
              </div>
              <button type="submit" className="form-submit w-full mt-4">
                Submit Verification Request
              </button>
            </form>
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

// Main component that provides wallet context
export default function Home() {
  return (
    <WalletProvider>
      <HomeContent />
    </WalletProvider>
  );
} 