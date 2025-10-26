import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  CloudArrowUpIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  UserCircleIcon,
  PlusIcon,
  ArrowPathIcon,
  FunnelIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { analysisApi, conflictsApi } from '../../services/api'
import Link from 'next/link'

// Import new components
import { AnimatedButton } from '../../components/ui/animated-button'
import { AnimatedCard, AnimatedCardGrid } from '../../components/ui/animated-card'
import { FloatingActionButton } from '../../components/ui/floating-action-button'
import { CommandPalette } from '../../components/ui/command-palette'
import { ScrollProgress, CircularScrollProgress } from '../../components/ui/scroll-progress'
import { FloatingOrbs, GradientMesh } from '../../components/ui/particle-background'
import { ToastContainer, useEnhancedToast } from '../../components/ui/enhanced-toast'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

interface DashboardStats {
  totalAnalyses: number
  totalConflicts: number
  pendingConflicts: number
  resolvedConflicts: number
  totalRows: number
  avgProcessingTime: number
  aiAccuracy: number
  fraudDetected: number
}

interface Activity {
  id: string
  type: 'upload' | 'analysis' | 'resolution' | 'alert'
  title: string
  description: string
  timestamp: Date
  status: 'success' | 'warning' | 'error' | 'info'
}

export default function UltraDashboard() {
  const { user } = useAuth()
  const { toasts, dismissToast, success, error, info } = useEnhancedToast()
  
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 1247,
    totalConflicts: 89,
    pendingConflicts: 23,
    resolvedConflicts: 66,
    totalRows: 45823,
    avgProcessingTime: 2.4,
    aiAccuracy: 94.8,
    fraudDetected: 12
  })

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      type: 'upload',
      title: 'New file uploaded',
      description: 'warehouse_inventory_2024.csv',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'success'
    },
    {
      id: '2',
      type: 'analysis',
      title: 'AI Analysis completed',
      description: '15 conflicts detected',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'warning'
    },
    {
      id: '3',
      type: 'resolution',
      title: 'Conflict resolved',
      description: 'UPC 123456789012',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'success'
    }
  ])

  const [loading, setLoading] = useState(false)

  // Animation refs
  const [headerRef, headerInView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [activityRef, activityInView] = useInView({ triggerOnce: true, threshold: 0.1 })

  useEffect(() => {
    // Show welcome toast
    info('Welcome back!', `Hello ${user?.name || 'User'}, you have ${stats.pendingConflicts} pending conflicts.`)
  }, [])

  const statCards = [
    {
      title: 'Total Analyses',
      value: stats.totalAnalyses.toLocaleString(),
      icon: ChartBarIcon,
      gradient: 'from-blue-500 to-cyan-400',
      change: '+12.5%',
      changePositive: true,
      description: 'Files processed this month'
    },
    {
      title: 'Active Conflicts',
      value: stats.pendingConflicts.toLocaleString(),
      icon: ExclamationTriangleIcon,
      gradient: 'from-orange-500 to-red-400',
      change: '-8.3%',
      changePositive: true,
      description: 'Requiring attention'
    },
    {
      title: 'AI Accuracy',
      value: `${stats.aiAccuracy}%`,
      icon: CpuChipIcon,
      gradient: 'from-purple-500 to-pink-400',
      change: '+2.1%',
      changePositive: true,
      description: 'Claude detection rate'
    },
    {
      title: 'Fraud Detected',
      value: stats.fraudDetected.toLocaleString(),
      icon: SparklesIcon,
      gradient: 'from-green-500 to-emerald-400',
      change: '+28.4%',
      changePositive: false,
      description: 'Suspicious patterns found'
    }
  ]

  const quickActions = [
    {
      icon: <CloudArrowUpIcon className="w-6 h-6" />,
      label: 'Upload File',
      onClick: () => {
        success('Redirecting...', 'Opening upload page')
      }
    },
    {
      icon: <SparklesIcon className="w-6 h-6" />,
      label: 'AI Analysis',
      onClick: () => {
        success('Starting...', 'Initializing AI analysis')
      }
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      label: 'View Reports',
      onClick: () => {
        info('Reports', 'Loading analytics dashboard')
      }
    }
  ]

  const refreshData = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      success('Data refreshed', 'Dashboard updated with latest information')
    } catch (err) {
      error('Refresh failed', 'Could not update dashboard data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30 relative overflow-hidden">
      {/* Background effects */}
      <GradientMesh />
      <FloatingOrbs orbCount={3} />
      
      {/* Scroll progress */}
      <ScrollProgress />
      <CircularScrollProgress />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="top-right" />

      {/* Floating action button */}
      <FloatingActionButton
        icon={<PlusIcon className="w-6 h-6" />}
        actions={quickActions}
        tooltip="Quick Actions"
      />

      {/* Header */}
      <motion.header
        ref={headerRef}
        initial={{ opacity: 0, y: -20 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and title */}
            <div className="flex items-center gap-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
                  <SparklesIcon className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  UPC Intelligence Hub
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-Powered Conflict Resolution
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <CommandPalette />
              
              <AnimatedButton
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={refreshData}
                loading={loading}
              >
                Refresh
              </AnimatedButton>

              <ThemeToggle />

              <motion.button
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BellIcon className="w-6 h-6" />
                <motion.span
                  className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>

              <motion.button
                className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserCircleIcon className="w-6 h-6" />
                <span className="text-sm font-medium hidden md:block">{user?.email || 'User'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name || 'User'}! 👋
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Here's what's happening with your warehouse data today.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          ref={statsRef}
          initial={{ opacity: 0 }}
          animate={statsInView ? { opacity: 1 } : {}}
        >
          <AnimatedCardGrid columns={4} className="mb-8">
            {statCards.map((stat, index) => (
              <AnimatedCard
                key={stat.title}
                variant="glass"
                hover3D
                glowOnHover
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Value */}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>

                  {/* Change indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <ArrowTrendingUpIcon
                        className={`w-4 h-4 ${
                          stat.changePositive ? 'text-green-500' : 'text-red-500'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          stat.changePositive ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      vs last month
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.description}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </AnimatedCardGrid>
        </motion.div>

        {/* AI Insights banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <AnimatedCard variant="gradient" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90" />
            <div className="relative z-10 flex items-center justify-between text-white">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">AI Insights</h3>
                </div>
                <p className="text-blue-100 max-w-2xl">
                  Claude AI has analyzed <span className="font-bold">{stats.totalRows.toLocaleString()}</span> records
                  and detected <span className="font-bold">{stats.fraudDetected}</span> potential fraud cases with{' '}
                  <span className="font-bold">{stats.aiAccuracy}%</span> accuracy this month.
                </p>
                <AnimatedButton
                  variant="ghost"
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  icon={<SparklesIcon className="w-5 h-5" />}
                >
                  View Detailed Analysis
                </AnimatedButton>
              </div>
              <motion.div
                className="hidden lg:block text-6xl font-bold"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {stats.aiAccuracy}%
              </motion.div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Activity feed and quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <motion.div
            ref={activityRef}
            initial={{ opacity: 0, x: -20 }}
            animate={activityInView ? { opacity: 1, x: 0 } : {}}
            className="lg:col-span-2"
          >
            <AnimatedCard variant="glass">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <FunnelIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                      activity.status === 'warning' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                      activity.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    }`}>
                      {activity.type === 'upload' && <CloudArrowUpIcon className="w-5 h-5" />}
                      {activity.type === 'analysis' && <SparklesIcon className="w-5 h-5" />}
                      {activity.type === 'resolution' && <CheckCircleIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                      <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={activityInView ? { opacity: 1, x: 0 } : {}}
            className="space-y-6"
          >
            <AnimatedCard variant="glass">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Processing Time
              </h3>
              <div className="text-center py-6">
                <motion.div
                  className="text-5xl font-bold gradient-text mb-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {stats.avgProcessingTime}s
                </motion.div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Average per file
                </p>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </AnimatedCard>

            <AnimatedCard variant="glass">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Resolution Rate
              </h3>
              <div className="text-center py-6">
                <motion.div
                  className="text-5xl font-bold text-green-500 mb-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  {Math.round((stats.resolvedConflicts / stats.totalConflicts) * 100)}%
                </motion.div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.resolvedConflicts} of {stats.totalConflicts} resolved
                </p>
              </div>
            </AnimatedCard>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

