import type { Metadata } from "next";
import { Chakra_Petch, Geist_Mono } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-arcade",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TETRIS CASCADE // Neo-Arcade Gravity Tetris",
  description: "High-octane arcade Tetris featuring in-air cascade gravity, chain reactions, retro synth sound engine, and competitive leaderboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-[#f1f5f9] select-none overflow-x-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
