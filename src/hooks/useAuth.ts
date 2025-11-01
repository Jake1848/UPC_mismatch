import { useState, useEffect } from 'react'
import { User, Organization } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  const login = async (email: string, password: string) => {
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
    } catch (err) {
      setError('Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
    setOrganization(null)
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
