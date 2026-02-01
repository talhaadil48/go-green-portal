"use client";

import Link from "next/link";
import { motion } from "framer-motion"; // optional — for subtle animation

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-green-950 via-emerald-950 to-black">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-18">
          {/* Logo */}
          <Link 
            href="#" 
            className="text-2xl md:text-3xl font-black tracking-tight text-white hover:text-green-300 transition-colors duration-300 flex items-center gap-2"
          >
            GO
            <span className="text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">GREEN</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8 font-medium">
            <Link 
              href="/claim" 
              className="text-green-100 hover:text-white transition-colors duration-300 relative group"
            >
              Claims
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
        
            {/* Add more links as needed */}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              className="text-green-200 hover:text-white focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}