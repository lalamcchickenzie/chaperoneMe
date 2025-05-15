import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./components/wallet-provider";
import Navbar from "./components/Navbar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "ChaperoneMe",
  description: "ChaperoneMe: Do not fret, you get verified!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <WalletProvider>
          <Navbar />
          {children}
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  );
}
