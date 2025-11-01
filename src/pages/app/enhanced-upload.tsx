import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { AnimatedButton } from '../../components/ui/animated-button'
import { AnimatedCard } from '../../components/ui/animated-card'
import { ScrollProgress } from '../../components/ui/scroll-progress'
import { GradientMesh } from '../../components/ui/particle-background'
import { useEnhancedToast } from '../../components/ui/enhanced-toast'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  preview?: string
  conflicts?: number
  records?: number
}

export default function EnhancedUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const { success, error, info } = useEnhancedToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Simulate upload and processing
    newFiles.forEach(uploadedFile => {
      simulateUpload(uploadedFile.id)
    })

    success('Files added', `${acceptedFiles.length} file(s) queued for upload`)
  }, [success])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: (rejectedFiles) => {
      setIsDragging(false)
      error('Upload failed', `${rejectedFiles.length} file(s) rejected. Check file type and size.`)
    }
  })

  const simulateUpload = (fileId: string) => {
    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.status === 'uploading') {
          const newProgress = Math.min(f.progress + Math.random() * 30, 100)
          if (newProgress >= 100) {
            clearInterval(uploadInterval)
            setTimeout(() => simulateProcessing(fileId), 500)
            return { ...f, progress: 100, status: 'processing' as const }
          }
          return { ...f, progress: newProgress }
        }
        return f
      }))
    }, 300)
  }

  const simulateProcessing = (fileId: string) => {
    // Simulate AI processing
    setTimeout(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          const conflicts = Math.floor(Math.random() * 50)
          const records = Math.floor(Math.random() * 10000) + 1000
          success('Processing complete', `Found ${conflicts} conflicts in ${records} records`)
          return {
            ...f,
            status: 'completed' as const,
            conflicts,
            records
          }
        }
        return f
      }))
    }, 3000)
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    info('File removed', 'File removed from queue')
  }

  const retryFile = (fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        simulateUpload(fileId)
        return { ...f, progress: 0, status: 'uploading' as const }
      }
      return f
    }))
    info('Retrying upload', 'File queued for re-upload')
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
      case 'processing':
        return <SparklesIcon className="w-5 h-5 animate-pulse text-purple-500" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'AI Processing...'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30 relative overflow-hidden">
      <GradientMesh />
      <ScrollProgress />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Upload Files
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload your warehouse inventory files for AI-powered conflict detection
          </p>
        </motion.div>

        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div
            {...getRootProps()}
            className={cn(
              'relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden',
              isDragActive || isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-105'
                : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
            )}
          >
            <input {...getInputProps()} />
            
            {/* Background animation */}
            <AnimatePresence>
              {(isDragActive || isDragging) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm"
                />
              )}
            </AnimatePresence>

            <div className="relative p-16 text-center">
              <motion.div
                animate={{
                  y: isDragActive || isDragging ? -10 : 0,
                  scale: isDragActive || isDragging ? 1.1 : 1
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="inline-flex p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-6 shadow-2xl">
                  <CloudArrowUpIcon className="w-16 h-16 text-white" />
                </div>
              </motion.div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {isDragActive || isDragging ? 'Drop files here' : 'Drop files to upload'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                or click to browse from your computer
              </p>

              <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  CSV
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  XLS
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  XLSX
                </span>
                <span className="text-gray-400">•</span>
                <span>Max 50MB</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Uploaded files list */}
        <AnimatePresence mode="popLayout">
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Upload Queue ({files.length})
                </h3>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </AnimatedButton>
              </div>

              {files.map((uploadedFile, index) => (
                <motion.div
                  key={uploadedFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <AnimatedCard variant="glass" hover3D={false}>
                    <div className="flex items-center gap-4">
                      {/* File icon */}
                      <div className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                        <DocumentIcon className="w-6 h-6 text-white" />
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {uploadedFile.file.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(uploadedFile.status)}
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {getStatusText(uploadedFile.status)}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                          <div className="mb-2">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadedFile.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* File details */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {uploadedFile.records && (
                            <>
                              <span>•</span>
                              <span>{uploadedFile.records.toLocaleString()} records</span>
                            </>
                          )}
                          {uploadedFile.conflicts !== undefined && (
                            <>
                              <span>•</span>
                              <span className={uploadedFile.conflicts > 0 ? 'text-orange-500' : 'text-green-500'}>
                                {uploadedFile.conflicts} conflicts
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {uploadedFile.status === 'error' && (
                          <AnimatedButton
                            variant="ghost"
                            size="sm"
                            icon={<ArrowPathIcon className="w-4 h-4" />}
                            onClick={() => retryFile(uploadedFile.id)}
                          >
                            Retry
                          </AnimatedButton>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFile(uploadedFile.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <AnimatedCard variant="glass">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-3">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                AI-Powered Analysis
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Claude 3.5 Sonnet automatically detects conflicts and anomalies
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glass">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 mb-3">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Fast Processing
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Process thousands of records in seconds with real-time updates
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="glass">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 mb-3">
                <DocumentIcon className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Multiple Formats
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Support for CSV, XLS, and XLSX files up to 50MB
              </p>
            </div>
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  )
}

