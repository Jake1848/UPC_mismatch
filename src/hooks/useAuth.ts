import { useState, useEffect } from 'react'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
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

    setUser(mockUser)
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
      setUser(mockUser)
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
  }

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  }
}
