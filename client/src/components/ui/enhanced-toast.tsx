import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Info as InformationCircleIcon,
  X as XMarkIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface EnhancedToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const toastConfig = {
  success: {
    icon: CheckCircleIcon,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: XCircleIcon,
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-800 dark:text-orange-200',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  info: {
    icon: InformationCircleIcon,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

export const EnhancedToast: React.FC<EnhancedToastProps> = ({ toast, onDismiss }) => {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  React.useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onDismiss(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm',
        config.bgColor,
        config.borderColor,
        'min-w-[320px] max-w-md'
      )}
    >
      {/* Gradient accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b', config.color)} />

      {/* Icon */}
      <div className={cn('flex-shrink-0 p-1', config.iconColor)}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-semibold text-sm', config.textColor)}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className={cn('text-sm mt-1 opacity-90', config.textColor)}>
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className={cn(
              'mt-2 text-sm font-medium underline hover:no-underline transition-all',
              config.iconColor
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
          config.textColor
        )}
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </motion.div>
  )
}

// Toast container
interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right'
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  }

  return (
    <div className={cn('fixed z-50 flex flex-col gap-3', positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <EnhancedToast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Toast hook
export const useEnhancedToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { ...toast, id, duration: toast.duration || 5000 }])
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = React.useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'success', title, message, action })
  }, [addToast])

  const error = React.useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'error', title, message, action })
  }, [addToast])

  const warning = React.useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'warning', title, message, action })
  }, [addToast])

  const info = React.useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'info', title, message, action })
  }, [addToast])

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    warning,
    info
  }
}

