'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import Cookies from 'js-cookie'
import { LogOut, User, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const token = Cookies.get("access_token")
      const userRole = Cookies.get("user_role")
      const userData = Cookies.get("user")

      setIsLoggedIn(!!token)
      setRole(userRole || null)

      // EXACTLY like you showed
      let extractedUsername: string | null = null
      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          extractedUsername = parsed?.username || null
        } catch {
          extractedUsername = null
        }
      }
      setUsername(extractedUsername)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    Cookies.remove('access_token', { path: '/' })
    Cookies.remove('refresh_token', { path: '/' })
    Cookies.remove('user_role', { path: '/' })
    Cookies.remove('user', { path: '/' })

    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-18">
          <Link
            href="/claim"
            className="text-2xl md:text-3xl font-black tracking-tight text-emerald-800 hover:text-emerald-600 transition-colors duration-300 flex items-center gap-2"
          >
            <img src="/image/logo.png" alt="Go Green" className="h-8 md:h-10" />
          </Link>

          {isLoggedIn && (
            <>
              {/* Desktop menu */}
              <div className="hidden md:flex items-center space-x-8 font-medium">
                <Link
                  href="/claim?view=active"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Claims
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/claim?view=closed"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Closed Claims
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/long-claims"
                  className="text-emerald-700 hover:text-emerald-900 transition-colors duration-300 relative group"
                >
                  Long Term Hire
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
                  Accounts
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

                {/* Profile Dropdown with username from cookie */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 px-4 py-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-all duration-300 border border-transparent hover:border-emerald-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User size={18} className="text-emerald-700" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">
                          {username || 'User'}
                        </span>
                        {role && (
                          <span className="text-[10px] text-emerald-600 -mt-0.5 capitalize">
                            {role}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-emerald-100 py-2 z-50">
                      
                      <button
                        onClick={() => {
                          handleLogout()
                          setShowProfileDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-1 text-rose-600 hover:bg-rose-50 transition-colors duration-200 text-left"
                      >
                        <LogOut size={18} />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  )}
                </div>
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
              claims
            </Link>
            <Link
              href="/long-claims"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Long Term Hire
            </Link>
            <Link
              href="/cars"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Fleet
            </Link>
            <Link
              href="/invoice"
              className="block text-emerald-700 hover:text-emerald-900 transition-colors duration-300"
              onClick={() => setMobileOpen(false)}
            >
              Accounts
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

            {/* Mobile Profile & Logout */}
            <div className="pt-4 border-t border-emerald-100">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User size={22} className="text-emerald-700" />
                </div>
                <div>
                  <p className="font-medium">{username || 'User'}</p>
                  {role && <p className="text-xs text-emerald-600 capitalize">{role}</p>}
                </div>
              </div>

              <button
                onClick={() => {
                  handleLogout()
                  setMobileOpen(false)
                }}
                className="flex items-center gap-3 w-full text-left px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}