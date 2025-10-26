'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  AlertTriangle,
  XCircle,
  ChevronDown,
  FileText
} from 'lucide-react'

interface Conflict {
  id: string
  upc: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  suggestedFix: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED'
  relatedRows: number[]
  createdAt: string
  analysis: {
    id: string
    fileName: string
    createdAt: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
}

interface Statistics {
  bySeverity: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  byStatus: {
    PENDING: number
    IN_PROGRESS: number
    RESOLVED: number
    IGNORED: number
  }
}

export default function ConflictsPage() {
  const router = useRouter()
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchConflicts()
  }, [page, search, selectedSeverities, selectedTypes, selectedStatuses])

  const fetchConflicts = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(selectedSeverities.length && { severity: selectedSeverities.join(',') }),
        ...(selectedTypes.length && { type: selectedTypes.join(',') }),
        ...(selectedStatuses.length && { status: selectedStatuses.join(',') })
      })

      const res = await fetch(`/api/conflicts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch conflicts')

      const data = await res.json()
      setConflicts(data.conflicts)
      setStatistics(data.statistics)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.pages)
      setLoading(false)
    } catch (error: any) {
      console.error('Failed to fetch conflicts:', error)
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900/20 text-red-400 border-red-800'
      case 'HIGH': return 'bg-orange-900/20 text-orange-400 border-orange-800'
      case 'MEDIUM': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800'
      case 'LOW': return 'bg-blue-900/20 text-blue-400 border-blue-800'
      default: return 'bg-slate-800 text-slate-400'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="w-4 h-4" />
      case 'HIGH': return <AlertCircle className="w-4 h-4" />
      case 'MEDIUM': return <AlertTriangle className="w-4 h-4" />
      case 'LOW': return <Clock className="w-4 h-4" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-900/20 text-green-400 border-green-800'
      case 'IN_PROGRESS': return 'bg-blue-900/20 text-blue-400 border-blue-800'
      case 'PENDING': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800'
      case 'IGNORED': return 'bg-slate-800 text-slate-400 border-slate-700'
      default: return 'bg-slate-800 text-slate-400'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ')
  }

  const toggleFilter = (array: string[], setArray: (val: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value))
    } else {
      setArray([...array, value])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Conflicts</h1>
          <p className="text-slate-400 mt-2">
            Detected UPC conflicts across all analyses
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* By Severity */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">By Severity</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-400">Critical</span>
                  <span className="text-sm font-bold text-white">{statistics.bySeverity.CRITICAL}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-orange-400">High</span>
                  <span className="text-sm font-bold text-white">{statistics.bySeverity.HIGH}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-yellow-400">Medium</span>
                  <span className="text-sm font-bold text-white">{statistics.bySeverity.MEDIUM}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-400">Low</span>
                  <span className="text-sm font-bold text-white">{statistics.bySeverity.LOW}</span>
                </div>
              </div>
            </div>

            {/* By Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">By Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-yellow-400">Pending</span>
                  <span className="text-sm font-bold text-white">{statistics.byStatus.PENDING}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-blue-400">In Progress</span>
                  <span className="text-sm font-bold text-white">{statistics.byStatus.IN_PROGRESS}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-400">Resolved</span>
                  <span className="text-sm font-bold text-white">{statistics.byStatus.RESOLVED}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Ignored</span>
                  <span className="text-sm font-bold text-white">{statistics.byStatus.IGNORED}</span>
                </div>
              </div>
            </div>

            {/* Total Conflicts */}
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Total Conflicts</h3>
              <p className="text-3xl font-bold text-white">{total.toLocaleString()}</p>
            </div>

            {/* Needs Attention */}
            <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Needs Attention</h3>
              <p className="text-3xl font-bold text-white">
                {(statistics.bySeverity.CRITICAL + statistics.bySeverity.HIGH).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="container mx-auto px-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UPC or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white flex items-center gap-2 transition"
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Severity Filters */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Severity</h4>
                <div className="space-y-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => (
                    <label key={severity} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSeverities.includes(severity)}
                        onChange={() => toggleFilter(selectedSeverities, setSelectedSeverities, severity)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                      />
                      <span className="text-sm text-slate-300">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Filters */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Type</h4>
                <div className="space-y-2">
                  {['DUPLICATE_UPC', 'PRICE_MISMATCH', 'INVALID_FORMAT', 'MISSING_DATA', 'QUANTITY_MISMATCH', 'LOCATION_CONFLICT'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleFilter(selectedTypes, setSelectedTypes, type)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                      />
                      <span className="text-sm text-slate-300">{getTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Status</h4>
                <div className="space-y-2">
                  {['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'].map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={() => toggleFilter(selectedStatuses, setSelectedStatuses, status)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                      />
                      <span className="text-sm text-slate-300">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conflicts List */}
        <div className="space-y-4 mb-8">
          {conflicts.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No conflicts found</h3>
              <p className="text-slate-400">
                {search || selectedSeverities.length || selectedTypes.length || selectedStatuses.length
                  ? 'Try adjusting your filters or search term'
                  : 'Upload files to start detecting conflicts'
                }
              </p>
            </div>
          ) : (
            conflicts.map(conflict => (
              <div
                key={conflict.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition cursor-pointer"
                onClick={() => router.push(`/conflicts/${conflict.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Severity Badge */}
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${getSeverityColor(conflict.severity)}`}>
                        {getSeverityIcon(conflict.severity)}
                        {conflict.severity}
                      </div>

                      {/* Status Badge */}
                      <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(conflict.status)}`}>
                        {conflict.status.replace('_', ' ')}
                      </div>

                      {/* Type Badge */}
                      <div className="px-3 py-1 rounded-lg border text-xs font-semibold bg-slate-800 text-slate-300 border-slate-700">
                        {getTypeLabel(conflict.type)}
                      </div>
                    </div>

                    {/* UPC */}
                    <div className="mb-2">
                      <span className="text-sm text-slate-400">UPC:</span>
                      <span className="ml-2 text-lg font-mono font-bold text-white">{conflict.upc}</span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-300 mb-2">{conflict.description}</p>

                    {/* Suggested Fix */}
                    {conflict.suggestedFix && (
                      <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-300">
                          <strong>Suggested Fix:</strong> {conflict.suggestedFix}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>File: {conflict.analysis.fileName}</span>
                      <span>•</span>
                      <span>Rows: {conflict.relatedRows.join(', ')}</span>
                      <span>•</span>
                      <span>{new Date(conflict.createdAt).toLocaleDateString()}</span>
                      {conflict.assignedTo && (
                        <>
                          <span>•</span>
                          <span>Assigned to: {conflict.assignedTo.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pb-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 rounded-lg text-white transition"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-slate-300">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 rounded-lg text-white transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
