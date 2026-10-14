import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./app/workspace.css";
import "./pure-monochrome.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Elarventis — Kuljetuslaskujen tarkastus selkeästi",
  description: "Elarventis kehittää AI-avusteista ohjelmistoa kuljetuslaskujen sopimusperusteiseen tarkastukseen ja poikkeamien käsittelyyn.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fi"><body className={`${geist.variable} ${geistMono.variable}`}>{children}</body></html>;
}

