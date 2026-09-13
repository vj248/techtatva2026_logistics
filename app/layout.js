import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    template: "%s - Logistics TechTatva 26",
    default: "Logistics - TechTatva 2026",
  },
  description: "Logistics Management System for TechTatva 2026",
};

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  return await verifyJWT(token);
}

export default async function RootLayout({ children }) {
  const user = await getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar user={user} />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
