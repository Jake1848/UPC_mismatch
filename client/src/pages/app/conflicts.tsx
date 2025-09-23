import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { Conflict } from '../../types/index'
import { ConflictList } from '../../components/conflicts/ConflictList'
import { GlassCard } from '../../components/ui/GlassCard'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

export default function ConflictsPage() {
  const router = useRouter()
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null)

  const handleConflictClick = (conflict: Conflict) => {
    setSelectedConflict(conflict)
    // In a real app, this would open a detailed view or modal
    router.push(`/app/conflicts/${conflict.id}`)
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 rounded-full bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>

              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    UPC Conflicts
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage and resolve data conflicts
                  </p>
                </div>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ConflictList onConflictClick={handleConflictClick} />
        </motion.div>
      </main>
    </div>
  )
}