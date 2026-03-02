'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { LogOut } from 'lucide-react'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const token = Cookies.get("access_token")
      const userRole = Cookies.get("user_role")
      setIsLoggedIn(!!token)
      setRole(userRole || null)
    }, 500) // checks every 500ms

    return () => clearInterval(interval) // cleanup on unmount
  }, [])

  const handleLogout = () => {
    // Remove all relevant cookies
    Cookies.remove('access_token', { path: '/' })
    Cookies.remove('refresh_token', { path: '/' })
    Cookies.remove('user_role', { path: '/' })
    Cookies.remove('user', { path: '/' })

    // Optional: force redirect
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-18">
          <Link
            href="/"
            className="text-2xl md:text-3xl font-black tracking-tight text-emerald-800 hover:text-emerald-600 transition-colors duration-300 flex items-center gap-2"
          >
            <img src="/image/logo.jpeg" alt="Go Green" className="h-8 md:h-10" />
          </Link>

          {isLoggedIn && (
            <>
              {/* Desktop menu */}
              <div className="hidden md:flex items-center space-x-8 font-medium">
                <Link
                  href="/claim"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Active Claims
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/long-claims"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Long Term
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/cars"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Fleet
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/invoice"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Invoices
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/recently-deleted-claims"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Deleted Claims
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>

                {role === 'admin' && (
                  <Link
                    href="/users"
                    className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                  >
                    Moderators
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                )}

                {/* Logout button – desktop */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-rose-600 hover:text-rose-800 transition-colors duration-300 relative group"
                  aria-label="Log out"
                >
                  <LogOut size={20} />
                  Logout
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-500 group-hover:w-full transition-all duration-300"></span>
                </button>
              </div>
            </>
          )}

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-emerald-700 hover:text-emerald-900 focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && isLoggedIn && (
          <div className="md:hidden mt-2 space-y-4 px-2 pb-5 border-t border-emerald-100 pt-3">
            <Link
              href="/claim"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Claims
            </Link>
            <Link
              href="/long-claims"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Long Term
            </Link>
            <Link
              href="/cars"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Fleet
            </Link>
            <Link
              href="/recently-deleted-claims"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Deleted Claims
            </Link>

            {role === 'admin' && (
              <Link
                href="/users"
                className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
                onClick={() => setMobileOpen(false)}
              >
                Moderators
              </Link>
            )}

            {/* Logout – mobile */}
            <button
              onClick={() => {
                handleLogout()
                setMobileOpen(false)
              }}
              className="flex items-center gap-2 w-full text-left text-rose-600 hover:text-rose-800 transition-colors duration-300"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}