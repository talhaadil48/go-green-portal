// app/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const res = await fetch(
        `${apiUrl}/auth/login?username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // If your backend expects POST + JSON body instead, use this:
          // method: 'POST',
          // body: JSON.stringify({ username: email, password }),
        }
      )

      if (!res.ok) {
        throw new Error('Login failed – check credentials')
      }

      const data = await res.json()

      Cookies.set('access_token', data.access_token, {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })

      Cookies.set('refresh_token', data.refresh_token, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })

      Cookies.set('user_role', data.user.role, {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })

      // Optional: store minimal user info
      Cookies.set('user', JSON.stringify(data.user), {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })

      router.push('/claim') // or '/' or your dashboard route
    } catch (err: any) {
      console.error('Login error:', err)
      // TODO: show error message to user (add state + UI)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-black flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-0 overflow-hidden rounded-2xl shadow-2xl border border-green-800/30 bg-black/40 backdrop-blur-xl">

        {/* LEFT - BRANDING (hidden on mobile) */}
        <div className="relative hidden md:block bg-gradient-to-br from-green-800 via-emerald-900 to-green-950 p-12 lg:p-16">
          <div className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 h-full flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-5xl font-black text-white tracking-tighter mb-6">
                GO
                <span className="text-green-400">.</span>
                GREEN
              </div>

              <p className="text-2xl md:text-3xl text-green-200/90 font-medium mb-10">
                Protect your income.<br />Never miss a lesson.
              </p>

              <div className="space-y-6 text-lg text-green-100/90">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">✓</div>
                  <span>Like-for-like replacement vehicles</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">✓</div>
                  <span>Full claim management</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">✓</div>
                  <span>Same-day replacement</span>
                </div>
              </div>

              <p className="mt-12 text-green-300/80 text-xl">
                Hybrid & electric fleet • Driving instructors • Taxi drivers • Private drivers
              </p>
            </motion.div>
          </div>

          {/* Optional subtle background shape */}
          <div className="absolute bottom-0 right-0 w-3/4 opacity-10 pointer-events-none">
            <svg viewBox="0 0 600 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 250 L600 250 L600 300 L0 300 Z" fill="white" />
              <path
                d="M100 180 Q150 120 220 140 L380 140 Q450 120 500 180 L500 220 L100 220 Z"
                fill="currentColor"
                className="text-green-600"
              />
            </svg>
          </div>
        </div>

        {/* RIGHT - LOGIN FORM */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-green-400/80 text-lg mb-10">
              Sign in to manage your claims & replacements
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email / Username */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-green-300/90 flex items-center gap-2"
                >
                  <Mail size={18} />
                  Username
                </label>
                <div className="relative">
                  <input
                    id="text"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gogreenhire.co.uk"
                    className="w-full px-5 py-4 bg-black/40 border border-green-700/50 rounded-xl text-white placeholder:text-green-500/50 focus:outline-none focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-green-300/90 flex items-center gap-2"
                >
                  <Lock size={18} />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-5 py-4 bg-black/40 border border-green-700/50 rounded-xl text-white placeholder:text-green-500/50 focus:outline-none focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30 transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-lg rounded-xl shadow-lg shadow-green-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Login to Dashboard'
                )}
              </motion.button>
            </form>

            <p className="text-center text-green-400/60 mt-8 text-sm">
              Need help? Call us: <span className="text-green-300">01283 247 247</span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}