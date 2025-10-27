'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { FloatingOrbs } from '@/components/ui/particle-background'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════')
    console.log('🔐 [LOGIN PAGE] Component MOUNTED')
    console.log('🔐 [LOGIN PAGE] Current URL:', window.location.href)
    console.log('🔐 [LOGIN PAGE] Timestamp:', new Date().toISOString())
    console.log('═══════════════════════════════════════════════════')

    return () => {
      console.log('🔐 [LOGIN PAGE] Component UNMOUNTED')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('═══════════════════════════════════════════════════')
    console.log('🔐 [LOGIN PAGE] ======= LOGIN FORM SUBMITTED =======')
    console.log('🔐 [LOGIN PAGE] Email:', email)
    console.log('🔐 [LOGIN PAGE] Password length:', password.length)
    console.log('🔐 [LOGIN PAGE] Timestamp:', new Date().toISOString())
    console.log('═══════════════════════════════════════════════════')

    setError('')
    setLoading(true)

    try {
      console.log('🔐 [LOGIN PAGE] Sending POST request to /api/auth/login')
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      console.log('🔐 [LOGIN PAGE] Response received')
      console.log('🔐 [LOGIN PAGE] Status:', res.status)
      console.log('🔐 [LOGIN PAGE] Status Text:', res.statusText)
      console.log('🔐 [LOGIN PAGE] OK:', res.ok)
      console.log('🔐 [LOGIN PAGE] Headers:', Object.fromEntries(res.headers.entries()))

      if (!res.ok) {
        const data = await res.json()
        console.error('🔐 [LOGIN PAGE] ❌ Login FAILED')
        console.error('🔐 [LOGIN PAGE] Error data:', data)
        throw new Error(data.message || 'Login failed')
      }

      const data = await res.json()
      console.log('🔐 [LOGIN PAGE] ✅ Login SUCCESSFUL')
      console.log('🔐 [LOGIN PAGE] Response data keys:', Object.keys(data))
      console.log('🔐 [LOGIN PAGE] Token exists:', !!data.token)
      console.log('🔐 [LOGIN PAGE] Token length:', data.token?.length)

      localStorage.setItem('token', data.token)
      console.log('🔐 [LOGIN PAGE] Token saved to localStorage')
      console.log('🔐 [LOGIN PAGE] Redirecting to /dashboard')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('🔐 [LOGIN PAGE] ❌ Exception caught:', err)
      console.error('🔐 [LOGIN PAGE] Error message:', err.message)
      console.error('🔐 [LOGIN PAGE] Error stack:', err.stack)
      setError(err.message)
    } finally {
      setLoading(false)
      console.log('🔐 [LOGIN PAGE] Login process completed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingOrbs orbCount={3} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <AnimatedCard variant="glass" hover3D className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <AnimatedButton
              type="submit"
              disabled={loading}
              variant="gradient"
              ripple
              glow
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </AnimatedButton>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign up
            </Link>
          </div>
        </AnimatedCard>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-slate-400 hover:text-slate-300 text-sm">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
