import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { useRouter } from 'next/router'
import {
  MagnifyingGlassIcon,
  HomeIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  action: () => void
  keywords?: string[]
  shortcut?: string
}

interface CommandPaletteProps {
  commands?: Command[]
}

const defaultCommands: Command[] = [
  {
    id: 'home',
    label: 'Go to Dashboard',
    description: 'Navigate to the main dashboard',
    icon: <HomeIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['home', 'dashboard', 'main'],
    shortcut: 'G then H'
  },
  {
    id: 'upload',
    label: 'Upload File',
    description: 'Upload a new file for analysis',
    icon: <CloudArrowUpIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['upload', 'file', 'import'],
    shortcut: 'G then U'
  },
  {
    id: 'conflicts',
    label: 'View Conflicts',
    description: 'See all UPC conflicts',
    icon: <DocumentTextIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['conflicts', 'issues', 'problems'],
    shortcut: 'G then C'
  },
  {
    id: 'ai',
    label: 'AI Analysis',
    description: 'Run AI-powered analysis',
    icon: <SparklesIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['ai', 'analysis', 'claude'],
    shortcut: 'G then A'
  },
  {
    id: 'reports',
    label: 'View Reports',
    description: 'Access analytics and reports',
    icon: <ChartBarIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['reports', 'analytics', 'stats'],
    shortcut: 'G then R'
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure application settings',
    icon: <CogIcon className="w-5 h-5" />,
    action: () => {},
    keywords: ['settings', 'config', 'preferences'],
    shortcut: 'G then S'
  }
]

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands = defaultCommands
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  // Update default commands with router navigation
  const commandsWithRouter = commands.map(cmd => ({
    ...cmd,
    action: () => {
      const routes: Record<string, string> = {
        home: '/app/dashboard',
        upload: '/app/upload',
        conflicts: '/app/conflicts',
        ai: '/app/ai-analysis',
        reports: '/app/reports',
        settings: '/app/settings'
      }
      if (routes[cmd.id]) {
        router.push(routes[cmd.id])
      }
      setIsOpen(false)
      setSearch('')
    }
  }))

  // Open/close with Cmd+K or Ctrl+K
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    setIsOpen(!isOpen)
  }, [isOpen])

  // Close with Escape
  useHotkeys('escape', () => {
    if (isOpen) {
      setIsOpen(false)
      setSearch('')
    }
  }, [isOpen])

  // Navigation shortcuts
  useHotkeys('g,h', () => router.push('/app/dashboard'), { enabled: !isOpen })
  useHotkeys('g,u', () => router.push('/app/upload'), { enabled: !isOpen })
  useHotkeys('g,c', () => router.push('/app/conflicts'), { enabled: !isOpen })
  useHotkeys('g,a', () => router.push('/app/ai-analysis'), { enabled: !isOpen })
  useHotkeys('g,r', () => router.push('/app/reports'), { enabled: !isOpen })
  useHotkeys('g,s', () => router.push('/app/settings'), { enabled: !isOpen })

  // Filter commands based on search
  const filteredCommands = commandsWithRouter.filter(cmd => {
    const searchLower = search.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.includes(searchLower))
    )
  })

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return (
    <>
      {/* Trigger hint */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="px-2 py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
          ⌘K
        </kbd>
      </motion.button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', duration: 0.3 }}
                className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type a command or search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-white placeholder-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Commands list */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {filteredCommands.length > 0 ? (
                    <div className="space-y-1">
                      {filteredCommands.map((command, index) => (
                        <motion.button
                          key={command.id}
                          onClick={command.action}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                            index === selectedIndex
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          {command.icon && (
                            <div className={cn(
                              'p-2 rounded-lg',
                              index === selectedIndex
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            )}>
                              {command.icon}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{command.label}</div>
                            {command.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {command.description}
                              </div>
                            )}
                          </div>
                          {command.shortcut && (
                            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                              {command.shortcut}
                            </kbd>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                      <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No commands found</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↓</kbd>
                      to navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                      to select
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd>
                    to close
                  </span>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

