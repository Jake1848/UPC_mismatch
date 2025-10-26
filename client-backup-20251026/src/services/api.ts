import axios from 'axios'
import { toast } from '../components/ui/use-toast'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add organization ID if available
    const orgId = localStorage.getItem('organization_id')
    if (orgId) {
      config.headers['X-Organization-Id'] = orgId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token')
      localStorage.removeItem('organization_id')
      window.location.href = '/auth/login'
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      toast.error('Access denied. Please check your permissions.')
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: {
    email: string
    password: string
    name?: string
    organizationName: string
    organizationSlug?: string
  }) => api.post('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  getProfile: () => api.get('/api/auth/me'),

  updateProfile: (data: { name?: string; settings?: any }) =>
    api.patch('/api/auth/me', data),

  changePassword: (data: {
    currentPassword: string
    newPassword: string
  }) => api.post('/api/auth/change-password', data),

  inviteUser: (data: {
    email: string
    role: string
    name?: string
  }) => api.post('/api/auth/invite', data),
}

// Analysis API
export const analysisApi = {
  getAll: (params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }) => api.get('/api/analyses', { params }),

  getById: (id: string) => api.get(`/api/analyses/${id}`),

  upload: (file: File, settings?: any) => {
    const formData = new FormData()
    formData.append('file', file)
    if (settings) {
      formData.append('settings', JSON.stringify(settings))
    }

    return api.post('/api/analyses/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  updateColumnMapping: (id: string, columnMapping: any) =>
    api.patch(`/api/analyses/${id}/mapping`, { columnMapping }),

  delete: (id: string) => api.delete(`/api/analyses/${id}`),
}

// Conflicts API
export const conflictsApi = {
  getAll: (params?: {
    page?: number
    limit?: number
    status?: string
    severity?: string
    type?: string
    assignedTo?: string
    analysisId?: string
    search?: string
  }) => api.get('/api/conflicts', { params }),

  getById: (id: string) => api.get(`/api/conflicts/${id}`),

  assign: (id: string, assignedToId?: string) =>
    api.patch(`/api/conflicts/${id}/assign`, { assignedToId }),

  updateStatus: (
    id: string,
    data: { status: string; resolutionNotes?: string }
  ) => api.patch(`/api/conflicts/${id}/status`, data),

  bulkAssign: (conflictIds: string[], assignedToId?: string) =>
    api.post('/api/conflicts/bulk-assign', { conflictIds, assignedToId }),

  getStats: () => api.get('/api/conflicts/stats/summary'),
}

// Organization API
export const organizationApi = {
  get: () => api.get('/api/organizations'),

  updateSettings: (settings: any) =>
    api.patch('/api/organizations/settings', { settings }),

  getMembers: () => api.get('/api/organizations/members'),

  updateMemberRole: (userId: string, role: string) =>
    api.patch(`/api/organizations/members/${userId}/role`, { role }),

  deactivateMember: (userId: string) =>
    api.patch(`/api/organizations/members/${userId}/deactivate`),

  reactivateMember: (userId: string) =>
    api.patch(`/api/organizations/members/${userId}/reactivate`),

  getUsage: () => api.get('/api/organizations/usage'),
}

// Billing API
export const billingApi = {
  getSubscription: () => api.get('/api/billing/subscription'),

  createCheckout: (data: { planId: string; billingEmail: string }) =>
    api.post('/api/billing/checkout', data),

  handleCheckoutSuccess: (sessionId: string) =>
    api.post('/api/billing/checkout/success', { sessionId }),

  createPortalSession: () => api.post('/api/billing/portal'),

  cancelSubscription: (reason?: string) =>
    api.post('/api/billing/cancel', { reason }),

  reactivateSubscription: () => api.post('/api/billing/reactivate'),
}

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/api/reports/dashboard'),

  getTrends: (params?: {
    period?: string
    groupBy?: string
  }) => api.get('/api/reports/trends', { params }),

  getVendors: (params?: { limit?: number }) =>
    api.get('/api/reports/vendors', { params }),

  export: (params: {
    type: string
    format?: string
    dateFrom?: string
    dateTo?: string
  }) => api.get('/api/reports/export', { params, responseType: 'blob' }),
}

// Integrations API
export const integrationsApi = {
  getAll: () => api.get('/api/integrations'),

  getById: (id: string) => api.get(`/api/integrations/${id}`),

  create: (data: {
    name: string
    type: string
    config: any
  }) => api.post('/api/integrations', data),

  update: (
    id: string,
    data: { name?: string; config?: any; isActive?: boolean }
  ) => api.patch(`/api/integrations/${id}`, data),

  delete: (id: string) => api.delete(`/api/integrations/${id}`),

  test: (id: string) => api.post(`/api/integrations/${id}/test`),

  getAvailableTypes: () => api.get('/api/integrations/types/available'),
}

// Helper functions
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token)
}

export const removeAuthToken = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('organization_id')
}

export const setOrganizationId = (orgId: string) => {
  localStorage.setItem('organization_id', orgId)
}

export const getAuthToken = () => {
  return localStorage.getItem('auth_token')
}

export const isAuthenticated = () => {
  return !!getAuthToken()
}

// Download helper for blob responses
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default api