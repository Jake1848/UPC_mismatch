// Core types for the UPC Conflict Resolver application

export interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  organizationId: string
  lastLoginAt: Date | null
  createdAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
  maxUsers: number
  maxProducts: number
  trialEndsAt: Date | null
}

export interface Analysis {
  id: string
  fileName: string
  originalName: string
  fileSize: number
  fileMimeType: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  totalRecords: number
  uniqueUPCs: number
  uniqueProducts: number
  duplicateUPCs: number
  multiUPCProducts: number
  maxDuplication: number
  columnMapping: ColumnMapping
  uploadedBy: {
    id: string
    name: string
    email: string
  }
  createdAt: Date
  updatedAt: Date
  errorMessage?: string
}

export interface ColumnMapping {
  upc?: string
  sku?: string
  warehouse?: string
  location?: string
  description?: string
  brand?: string
  category?: string
  [key: string]: string | undefined
}

export interface Conflict {
  id: string
  type: 'DUPLICATE_UPC' | 'MULTI_UPC_PRODUCT'
  upc?: string
  productId?: string
  productIds: string[]
  upcs: string[]
  locations: string[]
  warehouses: string[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'
  costImpact?: number
  description: string
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  resolvedBy?: {
    id: string
    name: string
    email: string
  }
  assignedAt?: Date
  resolvedAt?: Date
  resolutionNotes?: string
  analysis: {
    id: string
    fileName: string
    originalName: string
  }
  createdAt: Date
  updatedAt: Date
  suggestions?: string[]
  automatable?: boolean
}

export interface DashboardStats {
  summary: {
    totalAnalyses: number
    totalConflicts: number
    unresolvedConflicts: number
    recentActivity: number
    resolutionRate: number
  }
  charts: {
    conflictsByType: Record<string, number>
    conflictsBySeverity: Record<string, number>
    monthlyTrends: Array<{
      month: Date
      analyses: number
      conflicts: number
    }>
  }
}

export interface ConflictStats {
  total: number
  byStatus: {
    new: number
    assigned: number
    inProgress: number
    resolved: number
  }
  bySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
  byType: {
    duplicate_upc: number
    multi_upc_product: number
  }
  totalCostImpact: number
  resolutionRate: number
}

export interface Subscription {
  plan: string
  subscriptionStatus: string
  subscription?: {
    id: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    cancelAt?: Date
  }
  paymentMethod?: {
    type: string
    card?: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    }
  }
  invoices: Array<{
    id: string
    amount: number
    currency: string
    status: string
    createdAt: Date
    pdfUrl?: string
  }>
  currentPlan: {
    price: number | string
    maxUsers: number
    maxProducts: number
    features: string[]
  }
  trial: {
    isActive: boolean
    endsAt?: Date
  }
}

export interface TeamMember {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
}

export interface Integration {
  id: string
  name: string
  type: string
  isActive: boolean
  lastSyncAt?: Date
  nextSyncAt?: Date
  errorCount: number
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export interface NotificationMessage {
  id: string
  type: 'analysis_complete' | 'new_conflict' | 'conflict_assigned' | 'conflict_resolved' | 'system_notification' | 'trial_expiring'
  title?: string
  message: string
  severity?: 'info' | 'warning' | 'error' | 'success'
  data?: any
  timestamp: number
  read?: boolean
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FileUploadProgress {
  analysisId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  message?: string
  error?: string
}

export interface ColumnDetectionSuggestion {
  column: string
  detectedAs: string
  confidence: number
  reasons: string[]
}

export interface ColumnDetectionResult {
  mapping: ColumnMapping
  confidence: number
  suggestions: ColumnDetectionSuggestion[]
  warnings: string[]
}

export interface VendorScorecard {
  vendorPrefix: string
  vendorName: string
  analysesCount: number
  totalRecords: number
  conflictCount: number
  criticalCount: number
  highCount: number
  totalCostImpact: number
  conflictRate: number
}

export interface TrendData {
  period: Date
  totalConflicts: number
  duplicateUpcs: number
  multiUpcProducts: number
  criticalConflicts: number
  highConflicts: number
  resolvedConflicts: number
}

export interface Theme {
  mode: 'light' | 'dark'
  primary: string
  secondary: string
  accent: string
}

export interface UserSettings {
  theme: Theme
  notifications: {
    email: boolean
    desktop: boolean
    conflicts: boolean
    analyses: boolean
  }
  dashboard: {
    defaultView: 'overview' | 'conflicts' | 'analyses'
    refreshInterval: number
  }
}