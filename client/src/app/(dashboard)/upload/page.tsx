'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadedFile {
  file: File
  id: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  analysisId?: string
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return extension === 'csv' || extension === 'xlsx' || extension === 'xls'
    })

    if (validFiles.length === 0) {
      alert('Please upload CSV or Excel files only')
      return
    }

    for (const file of validFiles) {
      const fileId = Math.random().toString(36).substring(7)
      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        status: 'uploading',
        progress: 0
      }

      setUploadedFiles(prev => [...prev, uploadedFile])
      await uploadFile(file, fileId)
    }
  }

  const uploadFile = async (file: File, fileId: string) => {
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ))
      }, 200)

      const res = await fetch('/api/analysis/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()

      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'processing', progress: 100, analysisId: data.analysisId }
          : f
      ))

      // Poll for completion
      pollAnalysisStatus(data.analysisId, fileId)
    } catch (error: any) {
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'error', error: error.message }
          : f
      ))
    }
  }

  const pollAnalysisStatus = async (analysisId: string, fileId: string) => {
    const token = localStorage.getItem('token')

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/analysis/${analysisId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()

        if (data.analysis.status === 'COMPLETED') {
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'completed' }
              : f
          ))
        } else if (data.analysis.status === 'FAILED') {
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'error', error: 'Processing failed' }
              : f
          ))
        } else {
          setTimeout(checkStatus, 2000)
        }
      } catch (error) {
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error', error: 'Status check failed' }
            : f
        ))
      }
    }

    checkStatus()
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const viewAnalysis = (analysisId?: string) => {
    if (analysisId) {
      router.push(`/analysis/${analysisId}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Upload Files</h1>
          <p className="text-slate-400 mt-2">
            Upload CSV or Excel files to detect UPC conflicts
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleChange}
            />

            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />

            <h3 className="text-xl font-semibold text-white mb-2">
              {dragActive ? 'Drop files here' : 'Upload your files'}
            </h3>

            <p className="text-slate-400 mb-6">
              Drag and drop files here, or click to browse
            </p>

            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer transition"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Select Files
            </label>

            <p className="text-sm text-slate-500 mt-4">
              Supports CSV, XLSX, XLS • Max 100MB per file
            </p>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-white">Processing Files</h3>

              {uploadedFiles.map(file => (
                <div
                  key={file.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <FileSpreadsheet className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">
                          {file.file.name}
                        </h4>
                        <p className="text-sm text-slate-400">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {/* Status */}
                        <div className="mt-2 flex items-center gap-2">
                          {file.status === 'uploading' && (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                              <span className="text-sm text-slate-400">
                                Uploading... {file.progress}%
                              </span>
                            </>
                          )}
                          {file.status === 'processing' && (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                              <span className="text-sm text-slate-400">
                                Processing...
                              </span>
                            </>
                          )}
                          {file.status === 'completed' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-400">
                                Completed
                              </span>
                            </>
                          )}
                          {file.status === 'error' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-400">
                                {file.error || 'Error'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {file.status === 'completed' && (
                        <button
                          onClick={() => viewAnalysis(file.analysisId)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                        >
                          View Results
                        </button>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-2">File Requirements</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• CSV files with comma or semicolon delimiters</li>
              <li>• Excel files (.xlsx, .xls) with data in the first sheet</li>
              <li>• Files must contain UPC codes (automatically detected)</li>
              <li>• Maximum file size: 100 MB</li>
              <li>• Supported columns: UPC, SKU, Price, Quantity, Location, etc.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
