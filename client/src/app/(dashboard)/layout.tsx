'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { CommandPalette } from '@/components/ui/command-palette'
import { ScrollProgress } from '@/components/ui/scroll-progress'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════')
    console.log('🎛️ [DASHBOARD LAYOUT] Component MOUNTED')
    console.log('🎛️ [DASHBOARD LAYOUT] Current pathname:', pathname)
    console.log('🎛️ [DASHBOARD LAYOUT] Timestamp:', new Date().toISOString())
    console.log('═══════════════════════════════════════════════════')

    const token = localStorage.getItem('token')
    console.log('🎛️ [DASHBOARD LAYOUT] Token exists:', !!token)

    if (!token) {
      console.warn('🎛️ [DASHBOARD LAYOUT] ⚠️ NO TOKEN - Redirecting to login')
      router.push('/auth/login')
      return
    }

    fetchUser()

    return () => {
      console.log('🎛️ [DASHBOARD LAYOUT] Component UNMOUNTED')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchUser = async () => {
    try {
      console.log('🎛️ [DASHBOARD LAYOUT] → Fetching user from /api/auth/me')
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('🎛️ [DASHBOARD LAYOUT] ← Response:', res.status, res.statusText)

      if (!res.ok) {
        console.error('🎛️ [DASHBOARD LAYOUT] ❌ Auth failed')
        throw new Error('Auth failed')
      }

      const data = await res.json()
      console.log('🎛️ [DASHBOARD LAYOUT] ✅ User data received:', data.user?.name)
      setUser(data.user)
    } catch (error) {
      console.error('🎛️ [DASHBOARD LAYOUT] ❌ Error fetching user:', error)
      localStorage.removeItem('token')
      console.log('🎛️ [DASHBOARD LAYOUT] Token removed, redirecting to login')
      router.push('/auth/login')
    }
  }

  const handleLogout = () => {
    console.log('═══════════════════════════════════════════════════')
    console.log('🎛️ [DASHBOARD LAYOUT] ======= LOGOUT INITIATED =======')
    console.log('🎛️ [DASHBOARD LAYOUT] Timestamp:', new Date().toISOString())
    console.log('═══════════════════════════════════════════════════')
    localStorage.removeItem('token')
    console.log('🎛️ [DASHBOARD LAYOUT] Token removed')
    console.log('🎛️ [DASHBOARD LAYOUT] Redirecting to login')
    router.push('/auth/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/upload', label: 'Upload', icon: Upload },
    { href: '/conflicts', label: 'Conflicts', icon: AlertTriangle },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <span className="text-xl font-bold text-white hidden sm:inline">UPC Resolver</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.organization?.name}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                        isActive(item.href)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  )
                })}

                <div className="border-t border-slate-800 pt-4 mt-4">
                  {user && (
                    <div className="px-4 py-2 mb-2">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      <p className="text-xs text-slate-500">{user.organization?.name}</p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {children}
      </div>

      {/* Global UI Components */}
      <ScrollProgress />
      <CommandPalette />
    </div>
  )
}
