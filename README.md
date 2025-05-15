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

To run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure
