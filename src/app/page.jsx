'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: ''
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
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

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-4 bg-[#1A2A3A]">
        <div className="flex items-center space-x-4">
          <a href="/" className="nav-link">HOME</a>
          <a href="#" className="nav-link" onClick={() => setShowForm(true)}>JOIN US TODAY</a>
        </div>
        <a href="#" className="nav-link">CONNECT</a>
      </nav>

      {/* Ticker Bar */}
      <div className="ticker-bar text-center">
        {formatDay(currentTime)} | DO YOU NOT NEED A CHAPERONE? CHAPERONEME IS HERE. | {formatTime(currentTime)}
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
              <textarea
                name="reason"
                placeholder="Why do you need a chaperone?"
                className="form-input"
                value={formData.reason}
                onChange={handleChange}
                required
                rows="4"
              />
              <button type="submit" className="form-submit w-full">
                Submit Verification Request
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
} 