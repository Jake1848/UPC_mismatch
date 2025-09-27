import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  CpuChipIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../services/websocket'
import { analysisApi, conflictsApi } from '../../services/api'
import { Analysis, Conflict } from '../../types/index'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalAnalyses: number
  totalConflicts: number
  pendingConflicts: number
  resolvedConflicts: number
  totalRows: number
  avgProcessingTime: number
}

export default function Dashboard() {
  const { user, organization, isAnalyst, checkTrialStatus } = useAuth()
  const webSocket = useWebSocket()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([])
  const [criticalConflicts, setCriticalConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)

  const trialStatus = checkTrialStatus()

  useEffect(() => {
    loadDashboardData()

    // Subscribe to real-time updates
    webSocket.on('analysis:complete', handleAnalysisComplete)
    webSocket.on('conflict:new', handleNewConflict)

    return () => {
      webSocket.off('analysis:complete', handleAnalysisComplete)
      webSocket.off('conflict:new', handleNewConflict)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const [analysesRes, conflictsRes, statsRes] = await Promise.all([
        analysisApi.getAll({ limit: 5 }),
        conflictsApi.getAll({ severity: 'CRITICAL', status: 'PENDING', limit: 5 }),
        conflictsApi.getStats()
      ])

      setRecentAnalyses(analysesRes.data.analyses)
      setCriticalConflicts(conflictsRes.data.conflicts)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalysisComplete = (data: any) => {
    loadDashboardData()
  }

  const handleNewConflict = (data: any) => {
    if (data.conflict.severity === 'CRITICAL') {
      setCriticalConflicts(prev => [data.conflict, ...prev].slice(0, 5))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'FAILED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'PROCESSING':
        return <CpuChipIcon className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary-200/30 via-transparent to-transparent dark:from-primary-900/20" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-secondary-200/30 via-transparent to-transparent dark:from-secondary-900/20" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/10 dark:bg-gray-800/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DocumentChartBarIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  UPC Conflict Resolver
                </h1>
              </div>

              {trialStatus.isTrialActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
                >
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Trial: {trialStatus.daysLeft} days left
                  </span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {organization?.name}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Analyses
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalAnalyses || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <DocumentChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Conflicts
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.pendingConflicts || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Rows Processed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalRows?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Team Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(organization as any)?.memberCount || organization?.maxUsers || 1}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Analyses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
            </CardHeader>
            <CardContent>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : recentAnalyses.length === 0 ? (
                <div className="text-center py-8">
                  <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No analyses yet. Upload your first file to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnalyses.map((analysis) => (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/20 dark:bg-gray-800/20 border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(analysis.status)}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {analysis.fileName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDistanceToNow(new Date(analysis.createdAt))} ago
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {analysis.totalRecords?.toLocaleString()} rows
                        </p>
                        {analysis.duplicateUPCs > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {analysis.duplicateUPCs} conflicts
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critical Conflicts */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Conflicts</CardTitle>
            </CardHeader>
            <CardContent>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : criticalConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No critical conflicts. Great work!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalConflicts.map((conflict) => (
                    <motion.div
                      key={conflict.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {conflict.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            UPC: {conflict.upc}
                          </p>
                          {conflict.costImpact && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Cost Impact: ${conflict.costImpact.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                          {conflict.severity}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild>
                  <Link href="/app/upload">
                    <CloudArrowUpIcon className="w-4 h-4 mr-2" /> Upload New File
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/conflicts">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" /> View All Conflicts
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/reports">
                    <ChartBarIcon className="w-4 h-4 mr-2" /> Generate Report
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
