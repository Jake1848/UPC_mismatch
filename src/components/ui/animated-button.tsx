import React, { useState } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  ripple?: boolean
  glow?: boolean
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  ripple = true,
  glow = false,
  className,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()
      
      setRipples([...ripples, { x, y, id }])
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id))
      }, 600)
    }
    
    if (props.onClick && !loading) {
      props.onClick(e as any)
    }
  }

  const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:hover:bg-blue-950',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
    gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-purple-500 shadow-lg hover:shadow-xl'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  }
  
  const glowClass = glow ? 'glow-primary' : ''

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], glowClass, className)}
      onClick={handleClick}
      disabled={loading}
      {...props}
    >
      {/* Shimmer effect */}
      <span className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            animation: 'ripple 0.6s ease-out'
          }}
        />
      ))}
      
      {/* Loading spinner */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mr-2"
        >
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </motion.div>
      )}
      
      {/* Icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
      
      {/* Icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </motion.button>
  )
}

