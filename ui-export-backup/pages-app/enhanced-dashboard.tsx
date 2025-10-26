import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../services/websocket'
import { analysisApi, conflictsApi } from '../../services/api'
import { toast } from '../../components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Import enhanced components
import { FileUpload } from '../../components/file-upload'
import { ConflictList } from '../../components/conflict-list'
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

// Quick action cards data
const quickActions = [
  {
    title: "Upload Data",
    description: "Import warehouse inventory files",
    icon: CloudArrowUpIcon,
    color: "from-blue-500 to-cyan-400",
    href: "/app/upload"
  },
  {
    title: "AI Analysis",
    description: "Claude-powered conflict resolution",
    icon: SparklesIcon,
    color: "from-purple-500 to-pink-400",
    href: "/app/ai-analysis"
  },
  {
    title: "View Reports",
    description: "Detailed analytics & insights",
    icon: ChartBarIcon,
    color: "from-green-500 to-emerald-400",
    href: "/app/reports"
  },
  {
    title: "Settings",
    description: "Configure detection rules",
    icon: CogIcon,
    color: "from-orange-500 to-amber-400",
    href: "/app/settings"
  }
]

export default function EnhancedDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    totalConflicts: 0,
    pendingConflicts: 0,
    resolvedConflicts: 0,
    totalRows: 0,
    avgProcessingTime: 0,
    aiAccuracy: 94.5,
    fraudDetected: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [analyses, conflicts] = await Promise.all([
        analysisApi.getAll(),
        conflictsApi.getAll()
      ])

      setStats({
        totalAnalyses: analyses.data?.total || 0,
        totalConflicts: conflicts.data?.total || 0,
        pendingConflicts: conflicts.data?.pending || 0,
        resolvedConflicts: conflicts.data?.resolved || 0,
        totalRows: analyses.data?.totalRows || 0,
        avgProcessingTime: analyses.data?.avgTime || 0,
        aiAccuracy: 94.5,
        fraudDetected: conflicts.data?.fraudulent || 0
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Modern Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-50"></div>
                <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <SparklesIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  UPC Intelligence Hub
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-Powered by Claude 3.5 Sonnet
                </p>
              </div>
            </motion.div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Search conflicts, UPCs..." className="pl-10 w-64" />
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <BellIcon className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <button className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <UserCircleIcon className="w-6 h-6" />
                <span className="text-sm font-medium">{user?.email}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: 'Total Analyses',
              value: stats.totalAnalyses,
              icon: ChartBarIcon,
              color: 'from-blue-500 to-cyan-400',
              change: '+12%',
              bgGlow: 'bg-blue-500/20'
            },
            {
              label: 'Active Conflicts',
              value: stats.pendingConflicts,
              icon: ExclamationTriangleIcon,
              color: 'from-orange-500 to-red-400',
              change: '-5%',
              bgGlow: 'bg-orange-500/20'
            },
            {
              label: 'AI Accuracy',
              value: `${stats.aiAccuracy}%`,
              icon: CpuChipIcon,
              color: 'from-purple-500 to-pink-400',
              change: '+3%',
              bgGlow: 'bg-purple-500/20'
            },
            {
              label: 'Fraud Detected',
              value: stats.fraudDetected,
              icon: SparklesIcon,
              color: 'from-green-500 to-emerald-400',
              change: '+28%',
              bgGlow: 'bg-green-500/20'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="relative group"
            >
              {/* Glow Effect */}
              <div className={`absolute inset-0 ${stat.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

              {/* Card */}
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>

                {/* Stats */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>

                {/* Change Indicator */}
                <div className="flex items-center mt-2">
                  <ArrowTrendingUpIcon className={`w-4 h-4 mr-1 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change} from last month
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <motion.a
              key={action.title}
              href={action.href}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
                   style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}></div>
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-transparent transition-all">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${action.color} mb-4`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* AI Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">AI Insights</h2>
              <p className="text-blue-100">
                Claude detected <span className="font-bold">{stats.fraudDetected}</span> potential fraud cases and resolved{' '}
                <span className="font-bold">{stats.resolvedConflicts}</span> conflicts automatically this month.
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{stats.aiAccuracy}%</p>
              <p className="text-blue-100">Accuracy Rate</p>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              <ConflictList compact={true} />
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4"
            >
              <FileUpload onUploadComplete={() => {
                setShowUploadModal(false)
                loadDashboardData()
                toast.success('Upload complete! AI analysis started.')
              }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
