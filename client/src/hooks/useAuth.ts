import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { toast } from 'react-hot-toast'
import { authApi, setAuthToken, removeAuthToken, setOrganizationId } from '../services/api.js'
import { useWebSocket } from '../services/websocket.js'
import { User, Organization } from '../types/index'

interface AuthState {
  user: User | null
  organization: Organization | null
  loading: boolean
  isAuthenticated: boolean
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  name?: string
  organizationName: string
  organizationSlug?: string
}

export const useAuth = () => {
  const router = useRouter()
  const webSocket = useWebSocket()

  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    loading: true,
    isAuthenticated: false,
  })

  // Load user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      loadProfile()
    } else {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile()
      const { user, organization } = response.data

      setState({
        user,
        organization,
        loading: false,
        isAuthenticated: true,
      })

      setOrganizationId(organization.id)

      // Connect WebSocket
      const token = localStorage.getItem('auth_token')
      if (token) {
        webSocket.connect(token)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      removeAuthToken()
      setState({
        user: null,
        organization: null,
        loading: false,
        isAuthenticated: false,
      })
    }
  }, [webSocket])

  const login = async (data: LoginData) => {
    try {
      setState(prev => ({ ...prev, loading: true }))

      const response = await authApi.login(data)
      const { token, user, organization } = response.data

      setAuthToken(token)
      setOrganizationId(organization.id)

      setState({
        user,
        organization,
        loading: false,
        isAuthenticated: true,
      })

      // Connect WebSocket
      webSocket.connect(token)

      toast.success('Logged in successfully!')
      router.push('/app/dashboard')
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false }))
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, loading: true }))

      const response = await authApi.register(data)
      const { token, user, organization } = response.data

      setAuthToken(token)
      setOrganizationId(organization.id)

      setState({
        user,
        organization,
        loading: false,
        isAuthenticated: true,
      })

      // Connect WebSocket
      webSocket.connect(token)

      toast.success('Account created successfully!')
      router.push('/app/dashboard')
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false }))
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      removeAuthToken()
      webSocket.disconnect()

      setState({
        user: null,
        organization: null,
        loading: false,
        isAuthenticated: false,
      })

      toast.success('Logged out successfully')
      router.push('/auth/login')
    }
  }

  const updateProfile = async (data: { name?: string; settings?: any }) => {
    try {
      const response = await authApi.updateProfile(data)
      const updatedUser = response.data.user

      setState(prev => ({
        ...prev,
        user: updatedUser,
      }))

      toast.success('Profile updated successfully')
      return updatedUser
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
      throw error
    }
  }

  const changePassword = async (data: {
    currentPassword: string
    newPassword: string
  }) => {
    try {
      await authApi.changePassword(data)
      toast.success('Password changed successfully')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
      throw error
    }
  }

  const inviteUser = async (data: {
    email: string
    role: string
    name?: string
  }) => {
    try {
      const response = await authApi.inviteUser(data)
      toast.success('User invited successfully')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to invite user'
      toast.error(message)
      throw error
    }
  }

  const hasRole = (requiredRoles: string[]): boolean => {
    if (!state.user) return false
    return requiredRoles.includes(state.user.role)
  }

  const isAdmin = (): boolean => {
    return hasRole(['ADMIN'])
  }

  const isAnalyst = (): boolean => {
    return hasRole(['ADMIN', 'ANALYST'])
  }

  const checkTrialStatus = (): {
    isTrialActive: boolean
    daysLeft: number
    shouldShowWarning: boolean
  } => {
    if (!state.organization) {
      return { isTrialActive: false, daysLeft: 0, shouldShowWarning: false }
    }

    const isTrialActive = state.organization.subscriptionStatus === 'TRIAL'

    if (!isTrialActive || !state.organization.trialEndsAt) {
      return { isTrialActive: false, daysLeft: 0, shouldShowWarning: false }
    }

    const now = new Date()
    const trialEnd = new Date(state.organization.trialEndsAt)
    const timeDiff = trialEnd.getTime() - now.getTime()
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24))

    return {
      isTrialActive: true,
      daysLeft: Math.max(0, daysLeft),
      shouldShowWarning: daysLeft <= 7 && daysLeft > 0,
    }
  }

  return {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    inviteUser,
    hasRole,
    isAdmin,
    isAnalyst,
    checkTrialStatus,
    refetch: loadProfile,
  }
}