import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
  onClick?: () => void
  animate?: boolean
  delay?: number
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = true,
  gradient = false,
  onClick,
  animate = true,
  delay = 0,
}) => {
  const baseClasses = clsx(
    // Glass effect
    'relative backdrop-blur-xl',
    'bg-white/25 dark:bg-gray-800/25',
    'border border-white/20 dark:border-white/10',
    'rounded-glass-lg',
    'shadow-glass dark:shadow-glass-dark',

    // Layout
    'overflow-hidden',

    // Transitions
    'transition-all duration-300 ease-out',

    // Hover effects
    hover && [
      'hover:shadow-glass-lg dark:hover:shadow-glass-dark',
      'hover:-translate-y-1',
      'hover:bg-white/30 dark:hover:bg-gray-800/30',
    ],

    // Cursor
    onClick && 'cursor-pointer',

    // Custom classes
    className
  )

  const cardContent = (
    <div className={baseClasses} onClick={onClick}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full opacity-10 bg-gradient-to-r from-transparent via-white to-transparent transform rotate-45 translate-x-[-100%] animate-shimmer" />
      </div>

      {/* Gradient overlay */}
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
        whileHover={hover ? { y: -4, scale: 1.02 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {cardContent}
      </motion.div>
    )
  }

  return cardContent
}

export default GlassCard