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
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../services/websocket'
import { analysisApi, conflictsApi } from '../../services/api'
import { Analysis, Conflict } from '../../types/index'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface DashboardStats {
  totalAnalyses: number
  totalConflicts: number
  pendingConflicts: number
  resolvedConflicts: number
  totalRows: number
  avgProcessingTime: number
}

export default function Dashboard() {
  const { user, organization } = useAuth()
  const { connectionStatus } = useWebSocket()
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    totalConflicts: 0,
    pendingConflicts: 0,
    resolvedConflicts: 0,
    totalRows: 0,
    avgProcessingTime: 0
  })
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([])
  const [recentConflicts, setRecentConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [analysesRes, conflictsRes] = await Promise.all([
        analysisApi.getAnalyses({ limit: 5 }),
        conflictsApi.getConflicts({ limit: 5 })
      ])

      setStats({
        totalAnalyses: analysesRes.data?.total || 0,
        totalConflicts: conflictsRes.data?.total || 0,
        pendingConflicts: conflictsRes.data?.pending || 0,
        resolvedConflicts: conflictsRes.data?.resolved || 0,
        totalRows: analysesRes.data?.totalRows || 0,
        avgProcessingTime: analysesRes.data?.avgTime || 0
      })

      setRecentAnalyses(analysesRes.data?.data || [])
      setRecentConflicts(conflictsRes.data?.data || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-500'
      case 'processing': return 'text-blue-500'
      case 'failed': return 'text-red-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />
      case 'processing': return <ClockIcon className="h-4 w-4" />
      case 'failed': return <XCircleIcon className="h-4 w-4" />
      default: return <ClockIcon className="h-4 w-4" />
    }
  }

  const statCards = [
    {
      title: 'Total Analyses',
      value: stats.totalAnalyses.toLocaleString(),
      icon: <DocumentChartBarIcon className="h-6 w-6 text-blue-500" />,
      change: '+12.5%',
      changeType: 'increase'
    },
    {
      title: 'Active Conflicts',
      value: stats.pendingConflicts.toLocaleString(),
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />,
      change: '-5.2%',
      changeType: 'decrease'
    },
    {
      title: 'Records Processed',
      value: stats.totalRows.toLocaleString(),
      icon: <ChartBarIcon className="h-6 w-6 text-green-500" />,
      change: '+24.1%',
      changeType: 'increase'
    },
    {
      title: 'Avg Processing Time',
      value: `${stats.avgProcessingTime.toFixed(1)}s`,
      icon: <CpuChipIcon className="h-6 w-6 text-purple-500" />,
      change: '-15.3%',
      changeType: 'decrease'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <span className="text-lg">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'User'}. Here's what's happening with your conflicts.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
          </Badge>
          <Button asChild>
            <Link href="/app/upload">
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center space-x-1 text-xs">
                      {stat.changeType === 'increase' ? (
                        <ArrowUpIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span className={stat.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}>
                        {stat.change}
                      </span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-full">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="analyses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analyses">Recent Analyses</TabsTrigger>
              <TabsTrigger value="conflicts">Active Conflicts</TabsTrigger>
            </TabsList>

            <TabsContent value="analyses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Analyses</CardTitle>
                  <CardDescription>Your latest file processing results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAnalyses.length > 0 ? (
                      recentAnalyses.map((analysis) => (
                        <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${getStatusColor(analysis.status)}`}>
                              {getStatusIcon(analysis.status)}
                            </div>
                            <div>
                              <p className="font-medium">{analysis.filename}</p>
                              <p className="text-sm text-muted-foreground">
                                {analysis.totalRecords?.toLocaleString()} rows • {formatDistanceToNow(new Date(analysis.createdAt))} ago
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={analysis.duplicateUPCs > 0 ? 'destructive' : 'default'}>
                              {analysis.duplicateUPCs} conflicts
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <DocumentChartBarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No analyses yet. Upload your first file to get started!</p>
                        <Button asChild className="mt-4">
                          <Link href="/app/upload">Upload File</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Conflicts</CardTitle>
                  <CardDescription>Conflicts requiring your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentConflicts.length > 0 ? (
                      recentConflicts.map((conflict) => (
                        <div key={conflict.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="font-medium">UPC: {conflict.upc}</p>
                              <p className="text-sm text-muted-foreground">
                                {conflict.type} • {formatDistanceToNow(new Date(conflict.createdAt))} ago
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {conflict.severity}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-muted-foreground">No active conflicts. Great job!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UsersIcon className="h-5 w-5" />
                <span>Organization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{organization?.name || 'Default Organization'}</p>
                <p className="text-sm text-muted-foreground">
                  {(organization as any)?.memberCount || organization?.maxUsers || 1} team members
                </p>
              </div>
              <Progress
                value={((organization as any)?.memberCount || 1) / (organization?.maxUsers || 10) * 100}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {organization?.maxUsers || 10} user limit
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/app/upload">
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Upload New File
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/app/conflicts">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  View All Conflicts
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/app/ai-analysis">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  AI Analysis
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge variant="default">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Processing Queue</span>
                <Badge variant="secondary">2 pending</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Backup</span>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}