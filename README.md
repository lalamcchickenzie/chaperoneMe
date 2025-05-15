# ChaperoneMe

ChaperoneMe is a decentralized platform for tour guide verification and credential management built on the Solana blockchain. The platform ensures safe and authentic travel experiences by connecting travelers with thoroughly vetted local guides.

## Features

- Tour guide verification and credential management
- NFT-based credential system
- Admin verification panel
- Guide portfolio management
- Wallet integration with multiple Solana wallets
- Real-time verification status updates
- Secure document upload and storage

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Blockchain**: Solana (Devnet)
- **Smart Contracts**: Anchor Framework
- **UI Components**: 
  - Tailwind CSS
  - Radix UI
  - Shadcn UI
- **Wallet Integration**: 
  - Phantom
  - Solflare
  - Ledger
- **Storage**: IPFS (via Pinata)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Solana CLI tools
- A Solana wallet (Phantom, Solflare, or Ledger)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd chaperoneme
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your environment variables:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=your_program_id
```

## Development

Can be accessed through the website or run through the development server.

# ChaperoneMe User Guide

## How to Access and Use ChaperoneMe (chaperoneme.vercel.app)

### 1. Initial Access
- Visit chaperoneme.vercel.app in your web browser
- OR To run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
- You'll see the main landing page with the tagline "CHAPERONEME: DO NOT FRET, YOU GET VERIFIED!"

### 2. Connect Your Wallet
- Click the "Connect Wallet" button in the top right corner
- Choose from supported wallets:
  - Phantom
  - Solflare
  - Ledger
- Make sure your wallet is connected to Solana Devnet

### 3. For Tour Guides (Wanting to Get Verified)
- Click "Join Us" in the navigation bar
- You'll need to provide:
  - Personal Information:
    - IC (Identification Card number)
    - Name
    - Email
    - Phone number
  - Required Documents:
    - MOTAC License
    - Photo ID
    - Additional attachments (optional)
  - For Agency Guides:
    - Agency Name
    - Offer Letter
- Submit your application
- Wait for admin verification

### 4. For Travelers (Wanting to Verify Guides)
- Navigate to the "Guides" section
- View available verified guides
- Click on a guide's card to:
  - View their credentials
  - Scan their verification QR code
  - Check their verification status

### 5. For Verified Guides
- After verification, access your "Portfolio" page
- View your NFT credentials
- Manage your verification status
- Share your verification QR code with potential clients

### 6. For Admins
- Connect with the authorized admin wallet
- Access the admin panel at `/verify`
- Review and approve guide verification requests
- Manage guide portfolios

## Important Notes
- Make sure you have a Solana wallet installed (Phantom, Solflare, or Ledger)
- The platform operates on Solana Devnet, so you'll need Devnet SOL for transactions
- Keep your wallet secure and never share your private keys
- All document uploads are secured and stored on IPFS
- Verification process may take some time as it requires manual review


## Project Structure
chaperoneme/
├── src/
│ ├── app/ # Next.js app directory
│ │ ├── components/ # Reusable UI components
│ │ ├── verify/ # Verification page
│ │ ├── portfolio/ # Guide portfolio page
│ │ └── initialize/ # Admin initialization page
│ ├── contract/ # Smart contract files
│ └── lib/ # Utility functions and configs
├── public/ # Static assets
└── package.json # Project dependencies

## Key Features Implementation

### Guide Verification
- Tour guides can submit their credentials for verification
- Required documents: License, Photo ID, and additional attachments
- Admin panel for verification review and approval

### NFT Credentials
- Verified guides receive NFT credentials
- Credentials are stored on-chain and can be viewed in the portfolio
- QR code verification system for real-time credential checking

### Admin Features
- Secure admin panel for guide verification
- Initialization process for admin account
- Guide portfolio management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Key Features Implementation

### Guide Verification
- Tour guides can submit their credentials for verification
- Required documents: License, Photo ID, and additional attachments
- Admin panel for verification review and approval

### NFT Credentials
- Verified guides receive NFT credentials
- Credentials are stored on-chain and can be viewed in the portfolio
- QR code verification system for real-time credential checking

### Admin Features
- Secure admin panel for guide verification
- Initialization process for admin account
- Guide portfolio management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
