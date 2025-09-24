import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { authApi } from '../services/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const userData = await authApi.getProfile()
        setUser(userData.data)
      }
    } catch (error) {
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      router.push('/app/enhanced-dashboard')
    } catch (error) {
      throw error
    }
  }

  const register = async (userData: any) => {
    try {
      const response = await authApi.register(userData)
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      router.push('/app/enhanced-dashboard')
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/auth/login')
  }

  const value = {
    user,
    login,
    register,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}