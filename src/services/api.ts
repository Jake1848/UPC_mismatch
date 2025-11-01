import axios from 'axios'
import { Analysis, Conflict, ApiResponse, PaginatedResponse } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// Analysis API
export const analysisApi = {
  getAll: async (): Promise<Analysis[]> => {
    const response = await apiClient.get<ApiResponse<Analysis[]>>('/analysis')
    return response.data.data
  },

  getById: async (id: string): Promise<Analysis> => {
    const response = await apiClient.get<ApiResponse<Analysis>>(`/analysis/${id}`)
    return response.data.data
  },

  create: async (file: File): Promise<Analysis> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<ApiResponse<Analysis>>('/analysis', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/analysis/${id}`)
  },
}

// Conflicts API
export const conflictsApi = {
  getAll: async (analysisId?: string): Promise<Conflict[]> => {
    const params = analysisId ? { analysisId } : {}
    const response = await apiClient.get<ApiResponse<Conflict[]>>('/conflicts', { params })
    return response.data.data
  },

  getById: async (id: string): Promise<Conflict> => {
    const response = await apiClient.get<ApiResponse<Conflict>>(`/conflicts/${id}`)
    return response.data.data
  },

  updateStatus: async (id: string, status: Conflict['status']): Promise<Conflict> => {
    const response = await apiClient.patch<ApiResponse<Conflict>>(`/conflicts/${id}`, { status })
    return response.data.data
  },

  resolve: async (id: string, resolution: string): Promise<Conflict> => {
    const response = await apiClient.post<ApiResponse<Conflict>>(`/conflicts/${id}/resolve`, {
      resolution,
    })
    return response.data.data
  },
}

export default apiClient
