'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, FileText, Calendar, Database, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Analysis {
  id: string
  fileName: string
  fileSize: number
  totalRows: number
  conflictsFound: number
  lowSeverity: number
  mediumSeverity: number
  highSeverity: number
  criticalSeverity: number
  status: string
  processedAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  conflicts: Conflict[]
}

interface Conflict {
  id: string
  upc: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  suggestedFix: string | null
  status: string
  relatedRows: number[]
  createdAt: string
}

export default function AnalysisDetailPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId])

  const fetchAnalysis = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const res = await fetch(`/api/analysis/${analysisId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch analysis')

      const data = await res.json()
      setAnalysis(data.analysis)
      setLoading(false)
    } catch (error: any) {
      console.error('Failed to fetch analysis:', error)
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
      case 'MEDIUM': return <AlertCircle className="w-4 h-4" />
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Analysis Not Found</h2>
          <p className="text-slate-400 mb-6">This analysis may have been deleted or you don&apos;t have access to it.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const filteredConflicts = filter === 'ALL'
    ? analysis.conflicts
    : analysis.conflicts.filter(c => c.severity === filter)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">Analysis Details</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Analysis Info Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-4 mb-6">
                <FileText className="w-12 h-12 text-blue-500 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{analysis.fileName}</h2>
                  <p className="text-sm text-slate-400">
                    Uploaded by {analysis.user.name} on {new Date(analysis.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">File Size</p>
                  <p className="text-lg font-semibold text-white">
                    {(analysis.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Rows</p>
                  <p className="text-lg font-semibold text-white">
                    {analysis.totalRows.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${
                    analysis.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                    analysis.status === 'PROCESSING' ? 'bg-blue-900/20 text-blue-400' :
                    analysis.status === 'FAILED' ? 'bg-red-900/20 text-red-400' :
                    'bg-yellow-900/20 text-yellow-400'
                  }`}>
                    {analysis.status}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Processed</p>
                  <p className="text-sm text-white">
                    {analysis.processedAt ? new Date(analysis.processedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Severity Stats */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Conflicts by Severity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-slate-300">Critical</span>
                  </div>
                  <span className="text-lg font-bold text-red-400">{analysis.criticalSeverity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-slate-300">High</span>
                  </div>
                  <span className="text-lg font-bold text-orange-400">{analysis.highSeverity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-300">Medium</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-400">{analysis.mediumSeverity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Low</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{analysis.lowSeverity}</span>
                </div>
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-white">{analysis.conflictsFound}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({analysis.conflictsFound})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'CRITICAL'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Critical ({analysis.criticalSeverity})
          </button>
          <button
            onClick={() => setFilter('HIGH')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'HIGH'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            High ({analysis.highSeverity})
          </button>
          <button
            onClick={() => setFilter('MEDIUM')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'MEDIUM'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Medium ({analysis.mediumSeverity})
          </button>
          <button
            onClick={() => setFilter('LOW')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              filter === 'LOW'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Low ({analysis.lowSeverity})
          </button>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {filteredConflicts.length > 0 ? (
            filteredConflicts.map(conflict => (
              <Link
                key={conflict.id}
                href={`/conflicts/${conflict.id}`}
                className="block bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${getSeverityColor(conflict.severity)}`}>
                        {getSeverityIcon(conflict.severity)}
                        {conflict.severity}
                      </div>
                      <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(conflict.status)}`}>
                        {conflict.status.replace('_', ' ')}
                      </div>
                      <div className="px-3 py-1 rounded-lg border text-xs font-semibold bg-slate-800 text-slate-300 border-slate-700">
                        {getTypeLabel(conflict.type)}
                      </div>
                    </div>

                    <div className="mb-2">
                      <span className="text-sm text-slate-400">UPC:</span>
                      <span className="ml-2 text-lg font-mono font-bold text-white">{conflict.upc}</span>
                    </div>

                    <p className="text-slate-300 mb-2">{conflict.description}</p>

                    {conflict.suggestedFix && (
                      <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3">
                        <p className="text-sm text-blue-300">
                          <strong>Suggested Fix:</strong> {conflict.suggestedFix}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No conflicts in this category</h3>
              <p className="text-slate-400">Select another filter to view conflicts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
