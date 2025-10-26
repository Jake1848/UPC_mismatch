'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  User,
  Calendar,
  Hash
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
  resolutionNotes: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  analysis: {
    id: string
    fileName: string
    fileSize: number
    totalRows: number
    createdAt: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
}

export default function ConflictDetailPage() {
  const router = useRouter()
  const params = useParams()
  const conflictId = params.id as string

  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Edit states
  const [editStatus, setEditStatus] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')

  useEffect(() => {
    fetchConflict()
  }, [conflictId])

  const fetchConflict = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const res = await fetch(`/api/conflicts/${conflictId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch conflict')

      const data = await res.json()
      setConflict(data.conflict)
      setEditStatus(data.conflict.status)
      setEditNotes(data.conflict.resolutionNotes || '')
      setLoading(false)
    } catch (error: any) {
      console.error('Failed to fetch conflict:', error)
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!conflict) return

    setUpdating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: editStatus,
          resolutionNotes: editNotes || null
        })
      })

      if (!res.ok) throw new Error('Failed to update conflict')

      const data = await res.json()
      setConflict(data.conflict)
      setUpdating(false)

      // Show success message (you could use a toast here)
      alert('Conflict updated successfully!')
    } catch (error: any) {
      console.error('Failed to update conflict:', error)
      alert('Failed to update conflict')
      setUpdating(false)
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
      case 'CRITICAL': return <XCircle className="w-6 h-6" />
      case 'HIGH': return <AlertCircle className="w-6 h-6" />
      case 'MEDIUM': return <AlertTriangle className="w-6 h-6" />
      case 'LOW': return <Clock className="w-6 h-6" />
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

  if (!conflict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Conflict Not Found</h2>
          <p className="text-slate-400 mb-6">This conflict may have been deleted or you don't have access to it.</p>
          <button
            onClick={() => router.push('/conflicts')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Back to Conflicts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <button
            onClick={() => router.push('/conflicts')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Conflicts
          </button>
          <h1 className="text-3xl font-bold text-white">Conflict Details</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* UPC and Badges */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`flex items-center justify-center w-14 h-14 rounded-xl border ${getSeverityColor(conflict.severity)}`}>
                  {getSeverityIcon(conflict.severity)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${getSeverityColor(conflict.severity)}`}>
                      {conflict.severity}
                    </div>
                    <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(conflict.status)}`}>
                      {conflict.status.replace('_', ' ')}
                    </div>
                    <div className="px-3 py-1 rounded-lg border text-xs font-semibold bg-slate-800 text-slate-300 border-slate-700">
                      {getTypeLabel(conflict.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-slate-400" />
                    <span className="text-2xl font-mono font-bold text-white">{conflict.upc}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
                <p className="text-slate-200 text-lg">{conflict.description}</p>
              </div>

              {/* Suggested Fix */}
              {conflict.suggestedFix && (
                <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 Suggested Fix</h3>
                  <p className="text-blue-200">{conflict.suggestedFix}</p>
                </div>
              )}
            </div>

            {/* Resolution Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Resolution</h2>

              {/* Status Selector */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="IGNORED">Ignored</option>
                </select>
              </div>

              {/* Resolution Notes */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-400 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about how this conflict was resolved..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Resolved At */}
              {conflict.resolvedAt && (
                <div className="mb-4 p-3 bg-green-900/10 border border-green-800/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolved on {new Date(conflict.resolvedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Update Button */}
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Update Conflict
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="space-y-6">
            {/* Analysis Info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Analysis Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">File Name</p>
                  <p className="text-sm text-white font-medium break-all">{conflict.analysis.fileName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">File Size</p>
                  <p className="text-sm text-white">{(conflict.analysis.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Rows</p>
                  <p className="text-sm text-white">{conflict.analysis.totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Uploaded</p>
                  <p className="text-sm text-white">{new Date(conflict.analysis.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => router.push(`/analysis/${conflict.analysis.id}`)}
                  className="w-full mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  View Full Analysis
                </button>
              </div>
            </div>

            {/* Related Rows */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Related Rows</h3>
              <div className="flex flex-wrap gap-2">
                {conflict.relatedRows.map(row => (
                  <div
                    key={row}
                    className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 font-mono"
                  >
                    {row}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {conflict.relatedRows.length} row{conflict.relatedRows.length !== 1 ? 's' : ''} affected
              </p>
            </div>

            {/* Assignment */}
            {conflict.assignedTo && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Assigned To
                </h3>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {conflict.assignedTo.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{conflict.assignedTo.name}</p>
                    <p className="text-xs text-slate-400">{conflict.assignedTo.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-white">{new Date(conflict.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm text-white">{new Date(conflict.updatedAt).toLocaleString()}</p>
                </div>
                {conflict.resolvedAt && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Resolved</p>
                    <p className="text-sm text-green-400">{new Date(conflict.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Conflict ID */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Conflict ID</p>
              <p className="text-xs text-slate-500 font-mono break-all">{conflict.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
