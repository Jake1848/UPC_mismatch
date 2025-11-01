export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

export interface Organization {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
}

export interface Analysis {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  duplicatesFound: number
  createdAt: string
  updatedAt: string
}

export interface Conflict {
  id: string
  upc: string
  productName: string
  occurrences: number
  locations: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'resolved' | 'ignored'
  analysisId: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
