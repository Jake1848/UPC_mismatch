import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  tooltip?: string
  className?: string
  actions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    color?: string
  }>
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  position = 'bottom-right',
  tooltip,
  className,
  actions = []
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showTooltip, setShowTooltip] = React.useState(false)

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }

  const handleMainClick = () => {
    if (actions.length > 0) {
      setIsOpen(!isOpen)
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  action.onClick()
                  setIsOpen(false)
                }}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-full shadow-lg hover:shadow-xl transition-all',
                  action.color || 'bg-white dark:bg-gray-800'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xl">{action.icon}</span>
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {action.label}
                </motion.span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <div className="relative">
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && tooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap shadow-lg"
            >
              {tooltip}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleMainClick}
          onHoverStart={() => setShowTooltip(true)}
          onHoverEnd={() => setShowTooltip(false)}
          className={cn(
            'relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white overflow-hidden',
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
            'focus:outline-none focus:ring-4 focus:ring-blue-500/50',
            'transition-all duration-300',
            className
          )}
          whileHover={{ scale: 1.1, rotate: isOpen ? 45 : 0 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 blur-xl opacity-50"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />

          {/* Icon */}
          <motion.div
            className="relative z-10 text-2xl"
            animate={{ rotate: isOpen ? -45 : 0 }}
          >
            {icon}
          </motion.div>

          {/* Ripple effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white"
            initial={{ scale: 0, opacity: 0.5 }}
            whileHover={{
              scale: 1.5,
              opacity: 0
            }}
            transition={{ duration: 0.6 }}
          />
        </motion.button>
      </div>
    </div>
  )
}

