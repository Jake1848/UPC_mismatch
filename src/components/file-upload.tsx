"use client"

import React, { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline"
import { useDropzone } from "react-dropzone"
import { analysisApi } from "../services/api"
import { useWebSocket } from "../services/websocket"
import { toast } from "react-hot-toast"
import { GlassCard } from "./ui/GlassCard"

interface FileUploadProps {
  onUploadComplete?: (analysisId: string) => void
  maxFileSize?: number
  acceptedFileTypes?: string[]
}

interface UploadProgress {
  file: File
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  analysisId?: string
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  acceptedFileTypes = [".csv", ".xlsx", ".xls"],
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const webSocket = useWebSocket()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Subscribe to analysis progress updates
  React.useEffect(() => {
    webSocket.on("analysis:progress", handleAnalysisProgress)
    webSocket.on("analysis:complete", handleAnalysisComplete)

    return () => {
      webSocket.off("analysis:progress", handleAnalysisProgress)
      webSocket.off("analysis:complete", handleAnalysisComplete)
    }
  }, [])

  const handleAnalysisProgress = (data: any) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.analysisId === data.analysisId ? { ...upload, progress: data.progress, status: "processing" } : upload,
      ),
    )
  }

  const handleAnalysisComplete = (data: any) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.analysisId === data.analysisId ? { ...upload, progress: 100, status: "completed" } : upload,
      ),
    )

    if (onUploadComplete) {
      onUploadComplete(data.analysisId)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsDragActive(false)

      for (const file of acceptedFiles) {
        // Validate file size
        if (file.size > maxFileSize) {
          toast.error(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`)
          continue
        }

        // Validate file type
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
        if (!acceptedFileTypes.includes(fileExtension)) {
          toast.error(`File type ${fileExtension} is not supported. Accepted types: ${acceptedFileTypes.join(", ")}`)
          continue
        }

        // Add to uploads list
        const uploadId = Date.now() + Math.random()
        const upload: UploadProgress = {
          file,
          progress: 0,
          status: "uploading",
        }

        setUploads((prev) => [...prev, upload])

        try {
          // Upload file
          const response = await analysisApi.upload(file)
          const { analysisId } = response.data

          // Update upload with analysis ID
          setUploads((prev) =>
            prev.map((u) => (u.file === file ? { ...u, analysisId, progress: 10, status: "processing" } : u)),
          )

          // Subscribe to analysis updates
          webSocket.subscribeToAnalysis(analysisId)
        } catch (error: any) {
          console.error("Upload failed:", error)

          setUploads((prev) =>
            prev.map((u) =>
              u.file === file
                ? {
                    ...u,
                    status: "error",
                    error: error.response?.data?.message || "Upload failed",
                  }
                : u,
            ),
          )

          toast.error(`Failed to upload ${file.name}`)
        }
      }
    },
    [maxFileSize, acceptedFileTypes, onUploadComplete, webSocket],
  )

  const {
    getRootProps,
    getInputProps,
    isDragActive: dropzoneActive,
  } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  const removeUpload = (file: File) => {
    setUploads((prev) => prev.filter((u) => u.file !== file))
  }

  const retryUpload = (file: File) => {
    onDrop([file])
  }

  const getStatusIcon = (status: UploadProgress["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case "completed":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case "error":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = (upload: UploadProgress) => {
    switch (upload.status) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return `Processing... ${upload.progress}%`
      case "completed":
        return "Analysis completed"
      case "error":
        return upload.error || "Upload failed"
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <GlassCard className="overflow-hidden">
        <motion.div
          {...((): any => {
            const { onAnimationStart, onAnimationEnd, onTransitionEnd, ...rest } = getRootProps();
            return rest;
          })()}
          className={`
            relative p-12 text-center cursor-pointer transition-all duration-300
            ${
              isDragActive || dropzoneActive
                ? "bg-primary-50/50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600"
                : "hover:bg-white/30 dark:hover:bg-gray-800/30"
            }
          `}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input {...getInputProps()} ref={fileInputRef} />

          {/* Upload Icon */}
          <motion.div
            animate={{
              y: isDragActive || dropzoneActive ? -10 : 0,
              scale: isDragActive || dropzoneActive ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-primary-500 dark:text-primary-400" />
          </motion.div>

          {/* Upload Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDragActive || dropzoneActive ? "Drop files here" : "Upload warehouse data"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Drag and drop your CSV or Excel files, or{" "}
              <span className="text-primary-600 dark:text-primary-400 font-medium">browse files</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supports CSV, XLSX, XLS • Max {maxFileSize / 1024 / 1024}MB per file
            </p>
          </div>

          {/* Shimmer effect when dragging */}
          <AnimatePresence>
            {(isDragActive || dropzoneActive) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-200/20 to-transparent"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)",
                  animation: "shimmer 2s infinite",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </GlassCard>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Progress</h3>

                <div className="space-y-4">
                  {uploads.map((upload, index) => (
                    <motion.div
                      key={`${upload.file.name}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-4 p-4 rounded-lg bg-white/20 dark:bg-gray-800/20 border border-white/10"
                    >
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        <DocumentIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{upload.file.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(upload.status)}
                          <p className="text-xs text-gray-600 dark:text-gray-400">{getStatusText(upload)}</p>
                        </div>

                        {/* Progress Bar */}
                        {(upload.status === "uploading" || upload.status === "processing") && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <motion.div
                                className="bg-primary-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${upload.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {upload.status === "error" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => retryUpload(upload.file)}
                            className="p-1 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeUpload(upload.file)}
                          className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Column Detection Info */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Smart Column Detection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Supported Formats</h4>
              <ul className="space-y-1">
                <li>• CSV files with any delimiter</li>
                <li>• Excel files (.xlsx, .xls)</li>
                <li>• Custom warehouse formats</li>
                <li>• Files up to {maxFileSize / 1024 / 1024}MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Auto-Detected Columns</h4>
              <ul className="space-y-1">
                <li>• UPC/Barcode/GTIN codes</li>
                <li>• SKU/Product identifiers</li>
                <li>• Warehouse/Location data</li>
                <li>• Pricing and inventory</li>
              </ul>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
