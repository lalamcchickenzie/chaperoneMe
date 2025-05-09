import StampCard from '../components/StampCard';

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-[#2E3A50] flex flex-col items-center justify-start pt-16">
      <h1 className="text-white text-3xl font-mono mb-8">Tour Guide Stamps</h1>
      <StampCard guideName="John Doe" qrValue="https://chaperoneme.com/verify/johndoe" />
    </main>
  );
} 