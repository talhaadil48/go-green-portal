"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-green-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight hover:text-green-300 transition">
          Go Green
        </div>
        <div className="hidden md:flex space-x-6 font-medium">
          <Link href="/" className="hover:text-green-200 transition">
            Claims
          </Link>
       
        </div>
        <div className="md:hidden">
          {/* Mobile menu toggle button placeholder */}
          <button className="focus:outline-none">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
