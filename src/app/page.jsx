import StampCard from './components/StampCard';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#22344a' }}>
      <StampCard
        guideName="John Doe"
        guideImage="/download.jpeg"
        verificationUrl="https://chaperoneme.com/verify/guide123"
      />
    </main>
  );
} 