'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  FileText,
  AlertCircle,
  TrendingUp,
  Upload,
  Search,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalAnalyses: number
  totalConflicts: number
  resolvedConflicts: number
  totalRows: number
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
  byType: {
    DUPLICATE_UPC: number
    INVALID_FORMAT: number
    MISSING_DATA: number
    PRICE_MISMATCH: number
    QUANTITY_MISMATCH: number
    LOCATION_CONFLICT: number
  }
}

interface RecentAnalysis {
  id: string
  fileName: string
  status: string
  conflictsFound: number
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    try {
      // Fetch user profile
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!userRes.ok) throw new Error('Auth failed')
      const userData = await userRes.json()
      setUser(userData.user)

      // Fetch conflict stats
      const statsRes = await fetch('/api/conflicts/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.statistics)
      }

      // Fetch recent analyses
      const analysesRes = await fetch('/api/analysis?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (analysesRes.ok) {
        const analysesData = await analysesRes.json()
        setRecentAnalyses(analysesData.analyses)
      }

      setLoading(false)
    } catch (error) {
      console.error('Dashboard error:', error)
      localStorage.removeItem('token')
      router.push('/auth/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  const activeConflicts = stats ? (stats.byStatus.PENDING + stats.byStatus.IN_PROGRESS) : 0
  const totalRows = recentAnalyses.reduce((sum, a) => sum + (a as any).totalRows || 0, 0)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Welcome back, {user?.name} • {user?.organization?.name}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/upload"
            className="bg-gradient-to-br from-blue-900/20 to-blue-600/20 border border-blue-800/50 rounded-xl p-6 hover:border-blue-700 transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Files</h3>
                <p className="text-slate-400">Upload CSV or Excel files to detect conflicts</p>
              </div>
              <Upload className="w-12 h-12 text-blue-500 group-hover:scale-110 transition" />
            </div>
          </Link>

          <Link
            href="/conflicts"
            className="bg-gradient-to-br from-orange-900/20 to-orange-600/20 border border-orange-800/50 rounded-xl p-6 hover:border-orange-700 transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">View Conflicts</h3>
                <p className="text-slate-400">Review and resolve detected conflicts</p>
              </div>
              <Search className="w-12 h-12 text-orange-500 group-hover:scale-110 transition" />
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-white">
                {recentAnalyses.length > 0 ? recentAnalyses.length : 0}
              </span>
            </div>
            <div className="text-sm text-slate-400">Recent Analyses</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-orange-500" />
              <span className="text-3xl font-bold text-white">
                {activeConflicts.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-400">Active Conflicts</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-white">
                {stats?.byStatus.RESOLVED.toLocaleString() || 0}
              </span>
            </div>
            <div className="text-sm text-slate-400">Resolved</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <span className="text-3xl font-bold text-white">
                {totalRows.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-400">Records Processed</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Severity Breakdown */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Conflicts by Severity</h3>
            {stats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-slate-300">Critical</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${stats.totalConflicts > 0 ? (stats.bySeverity.CRITICAL / stats.totalConflicts * 100) : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">
                      {stats.bySeverity.CRITICAL}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-slate-300">High</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${stats.totalConflicts > 0 ? (stats.bySeverity.HIGH / stats.totalConflicts * 100) : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">
                      {stats.bySeverity.HIGH}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-slate-300">Medium</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${stats.totalConflicts > 0 ? (stats.bySeverity.MEDIUM / stats.totalConflicts * 100) : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">
                      {stats.bySeverity.MEDIUM}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-slate-300">Low</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${stats.totalConflicts > 0 ? (stats.bySeverity.LOW / stats.totalConflicts * 100) : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">
                      {stats.bySeverity.LOW}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No data available</p>
            )}
          </div>

          {/* Type Breakdown */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Conflicts by Type</h3>
            {stats ? (
              <div className="space-y-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${stats.totalConflicts > 0 ? (count / stats.totalConflicts * 100) : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Recent Analyses</h3>
            <Link
              href="/upload"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.map(analysis => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  onClick={() => router.push(`/analysis/${analysis.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-white">{analysis.fileName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{analysis.conflictsFound}</p>
                      <p className="text-xs text-slate-400">conflicts</p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      analysis.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                      analysis.status === 'PROCESSING' ? 'bg-blue-900/20 text-blue-400' :
                      analysis.status === 'FAILED' ? 'bg-red-900/20 text-red-400' :
                      'bg-yellow-900/20 text-yellow-400'
                    }`}>
                      {analysis.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No analyses yet</p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                <Upload className="w-5 h-5" />
                Upload Your First File
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
