import { useState, useEffect } from 'react'
import { User, Organization } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[Auth] Initializing authentication')
    // Mock authentication - in production, this would call your API
    const mockUser: User = {
      id: '1',
      email: 'user@example.com',
      name: 'Demo User',
      role: 'admin'
    }

    const mockOrganization: Organization = {
      id: '1',
      name: 'Demo Organization',
      plan: 'pro',
      createdAt: new Date().toISOString()
    }

    setUser(mockUser)
    setOrganization(mockOrganization)
    setLoading(false)
    console.log('[Auth] User authenticated:', mockUser.email, '| Organization:', mockOrganization.name)
  }, [])

  const login = async (email: string, password: string) => {
    console.log('[Auth] Login attempt for:', email)
    setLoading(true)
    try {
      // Mock login - in production, call your API
      const mockUser: User = {
        id: '1',
        email,
        name: 'Demo User',
        role: 'admin'
      }
      const mockOrganization: Organization = {
        id: '1',
        name: 'Demo Organization',
        plan: 'pro',
        createdAt: new Date().toISOString()
      }
      setUser(mockUser)
      setOrganization(mockOrganization)
      setError(null)
      console.log('[Auth] Login successful for:', email)
    } catch (err) {
      console.error('[Auth] Login failed:', err)
      setError('Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    console.log('[Auth] Logging out user')
    setUser(null)
    setOrganization(null)
    console.log('[Auth] Logout complete')
  }

  return {
    user,
    organization,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  }
}
