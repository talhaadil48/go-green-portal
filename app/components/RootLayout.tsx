"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { usePathname } from "next/navigation";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function WrapperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavAndFooter = pathname === "/draw";

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased mt-18`}>
        {!hideNavAndFooter && <Navbar />}
        {children}
        {!hideNavAndFooter && <Footer />}
      </body>
    </html>
  );
}