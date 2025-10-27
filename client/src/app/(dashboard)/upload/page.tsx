'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Play } from 'lucide-react'
import Papa from 'papaparse'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'

interface UploadedFile {
  file: File
  id: string
  status: 'ready' | 'processing' | 'completed' | 'error'
  progress: number
  analysisId?: string
  error?: string
  rowCount?: number
  conflictCount?: number
}

interface UPCRow {
  upc: string
  sku?: string
  name?: string
  price?: number
  quantity?: number
  location?: string
  [key: string]: any
}

interface Conflict {
  id: string
  type: 'DUPLICATE_UPC' | 'INVALID_FORMAT' | 'MISSING_DATA' | 'PRICE_MISMATCH'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  upc: string
  description: string
  affectedRows: number[]
  data: any
}

export default function UploadPage() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  console.log('📤 [UPLOAD PAGE] Rendered', { fileCount: uploadedFiles.length })

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
      console.log('📤 [UPLOAD PAGE] Files dropped:', e.dataTransfer.files.length)
      handleFiles(Array.from(e.dataTransfer.files))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      console.log('📤 [UPLOAD PAGE] Files selected:', e.target.files.length)
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (files: File[]) => {
    console.log('📤 [UPLOAD PAGE] Processing files:', files.map(f => f.name))
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return extension === 'csv'
    })

    if (validFiles.length === 0) {
      alert('Please upload CSV files only (Excel coming soon!)')
      return
    }

    for (const file of validFiles) {
      const fileId = Math.random().toString(36).substring(7)
      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        status: 'ready',
        progress: 0
      }

      setUploadedFiles(prev => [...prev, uploadedFile])
    }
  }

  const processFile = async (fileId: string) => {
    const fileObj = uploadedFiles.find(f => f.id === fileId)
    if (!fileObj) return

    console.log('═══════════════════════════════════════════════════')
    console.log('📤 [UPLOAD PAGE] ======= PROCESSING FILE =======')
    console.log('📤 [UPLOAD PAGE] File:', fileObj.file.name)
    console.log('📤 [UPLOAD PAGE] Size:', (fileObj.file.size / 1024).toFixed(2), 'KB')
    console.log('═══════════════════════════════════════════════════')

    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'processing', progress: 10 } : f
    ))

    try {
      // Parse CSV
      Papa.parse(fileObj.file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('📤 [UPLOAD PAGE] CSV parsed:', results.data.length, 'rows')

          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress: 40 } : f
          ))

          // Detect conflicts
          const conflicts = detectConflicts(results.data as UPCRow[])
          console.log('📤 [UPLOAD PAGE] Conflicts detected:', conflicts.length)

          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress: 70 } : f
          ))

          // Save analysis to localStorage
          const analysisId = 'analysis_' + Date.now()
          const savedAnalyses = JSON.parse(localStorage.getItem('upc_analyses') || '[]')
          const newAnalysis = {
            id: analysisId,
            fileName: fileObj.file.name,
            status: 'COMPLETED',
            conflictsFound: conflicts.length,
            totalRows: results.data.length,
            conflicts,
            data: results.data,
            createdAt: new Date().toISOString()
          }

          savedAnalyses.push(newAnalysis)
          localStorage.setItem('upc_analyses', JSON.stringify(savedAnalyses))
          console.log('📤 [UPLOAD PAGE] ✅ Analysis saved:', analysisId)

          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  analysisId,
                  rowCount: results.data.length,
                  conflictCount: conflicts.length
                }
              : f
          ))
        },
        error: (error) => {
          console.error('📤 [UPLOAD PAGE] ❌ Parse error:', error)
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error', error: error.message } : f
          ))
        }
      })
    } catch (error: any) {
      console.error('📤 [UPLOAD PAGE] ❌ Processing error:', error)
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error', error: error.message } : f
      ))
    }
  }

  const detectConflicts = (data: UPCRow[]): Conflict[] => {
    console.log('🔍 [CONFLICT DETECTION] Starting analysis...')
    const conflicts: Conflict[] = []

    // Detect UPC column
    const firstRow = data[0]
    if (!firstRow) return conflicts

    const upcColumn = Object.keys(firstRow).find(key =>
      key.toLowerCase().includes('upc') || key.toLowerCase().includes('code')
    )

    if (!upcColumn) {
      console.warn('🔍 [CONFLICT DETECTION] ⚠️ No UPC column found')
      return conflicts
    }

    console.log('🔍 [CONFLICT DETECTION] UPC column:', upcColumn)

    // Build UPC map
    const upcMap = new Map<string, number[]>()
    const priceMap = new Map<string, number[]>()

    data.forEach((row, index) => {
      const upc = row[upcColumn]?.toString().trim()
      if (!upc) return

      // Track row indices for each UPC
      if (!upcMap.has(upc)) {
        upcMap.set(upc, [])
      }
      upcMap.get(upc)!.push(index)

      // Track prices
      const price = parseFloat(row.price || row.Price || row.PRICE || '0')
      if (price > 0) {
        if (!priceMap.has(upc)) {
          priceMap.set(upc, [])
        }
        priceMap.get(upc)!.push(price)
      }
    })

    console.log('🔍 [CONFLICT DETECTION] Unique UPCs:', upcMap.size)

    // 1. Detect duplicates
    upcMap.forEach((rowIndices, upc) => {
      if (rowIndices.length > 1) {
        conflicts.push({
          id: `conflict_${conflicts.length}`,
          type: 'DUPLICATE_UPC',
          severity: rowIndices.length > 5 ? 'HIGH' : rowIndices.length > 2 ? 'MEDIUM' : 'LOW',
          upc,
          description: `UPC "${upc}" appears ${rowIndices.length} times`,
          affectedRows: rowIndices,
          data: { count: rowIndices.length }
        })
      }
    })

    // 2. Detect invalid UPC formats
    data.forEach((row, index) => {
      const upc = row[upcColumn]?.toString().trim()
      if (!upc) {
        conflicts.push({
          id: `conflict_${conflicts.length}`,
          type: 'MISSING_DATA',
          severity: 'MEDIUM',
          upc: '',
          description: `Row ${index + 1}: Missing UPC`,
          affectedRows: [index],
          data: row
        })
      } else if (!/^\d+$/.test(upc)) {
        conflicts.push({
          id: `conflict_${conflicts.length}`,
          type: 'INVALID_FORMAT',
          severity: 'HIGH',
          upc,
          description: `UPC "${upc}" contains non-numeric characters`,
          affectedRows: [index],
          data: row
        })
      } else if (![8, 12, 13, 14].includes(upc.length)) {
        conflicts.push({
          id: `conflict_${conflicts.length}`,
          type: 'INVALID_FORMAT',
          severity: 'MEDIUM',
          upc,
          description: `UPC "${upc}" has invalid length (${upc.length} digits)`,
          affectedRows: [index],
          data: row
        })
      }
    })

    // 3. Detect price mismatches
    priceMap.forEach((prices, upc) => {
      const uniquePrices = Array.from(new Set(prices))
      if (uniquePrices.length > 1) {
        const rows = upcMap.get(upc) || []
        conflicts.push({
          id: `conflict_${conflicts.length}`,
          type: 'PRICE_MISMATCH',
          severity: 'CRITICAL',
          upc,
          description: `UPC "${upc}" has ${uniquePrices.length} different prices: $${uniquePrices.join(', $')}`,
          affectedRows: rows,
          data: { prices: uniquePrices }
        })
      }
    })

    console.log('🔍 [CONFLICT DETECTION] ✅ Analysis complete')
    console.log('🔍 [CONFLICT DETECTION] Total conflicts:', conflicts.length)
    return conflicts
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const viewAnalysis = (analysisId?: string) => {
    if (analysisId) {
      console.log('📤 [UPLOAD PAGE] Navigating to analysis:', analysisId)
      router.push(`/conflicts?analysisId=${analysisId}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Upload & Analyze Files</h1>
          <p className="text-slate-400 mt-2">
            Upload CSV files to detect UPC conflicts in real-time
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Zone */}
          <AnimatedCard variant="glass" className="p-12">
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
                accept=".csv"
                onChange={handleChange}
              />

              <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-white mb-2">
                {dragActive ? 'Drop your CSV files here' : 'Upload CSV Files'}
              </h3>

              <p className="text-slate-400 mb-6">
                Drag and drop CSV files here, or click to browse
              </p>

              <AnimatedButton
                variant="gradient"
                ripple
                glow
                onClick={() => document.getElementById('file-upload')?.click()}
                className="inline-flex items-center"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Select CSV Files
              </AnimatedButton>

              <p className="text-sm text-slate-500 mt-4">
                CSV files only • Unlimited file size • Processed locally in your browser
              </p>
            </div>
          </AnimatedCard>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-white">Files Ready for Analysis</h3>

              {uploadedFiles.map(file => (
                <AnimatedCard key={file.id} variant="glass" className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <FileSpreadsheet className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">
                          {file.file.name}
                        </h4>
                        <p className="text-sm text-slate-400">
                          {(file.file.size / 1024).toFixed(2)} KB
                        </p>

                        {/* Status */}
                        <div className="mt-2 flex items-center gap-2">
                          {file.status === 'ready' && (
                            <span className="text-sm text-slate-400">
                              Ready to process
                            </span>
                          )}
                          {file.status === 'processing' && (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                              <span className="text-sm text-slate-400">
                                Analyzing... {file.progress}%
                              </span>
                            </>
                          )}
                          {file.status === 'completed' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-400">
                                Complete • {file.rowCount} rows • {file.conflictCount} conflicts found
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
                        {file.status === 'processing' && (
                          <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {file.status === 'ready' && (
                        <AnimatedButton
                          variant="gradient"
                          ripple
                          onClick={() => processFile(file.id)}
                          className="flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Analyze
                        </AnimatedButton>
                      )}
                      {file.status === 'completed' && (
                        <AnimatedButton
                          variant="primary"
                          ripple
                          onClick={() => viewAnalysis(file.analysisId)}
                        >
                          View Conflicts
                        </AnimatedButton>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          )}

          {/* Info Card */}
          <AnimatedCard variant="gradient" className="mt-8 p-6">
            <h3 className="font-semibold text-white mb-4">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-xl font-bold text-blue-400">1</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Upload CSV</h4>
                <p className="text-sm text-slate-300">
                  Upload your inventory CSV file with UPC codes
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-xl font-bold text-purple-400">2</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Auto-Detect</h4>
                <p className="text-sm text-slate-300">
                  AI instantly detects duplicates, format errors, and price mismatches
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-xl font-bold text-pink-400">3</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Resolve</h4>
                <p className="text-sm text-slate-300">
                  Review and resolve conflicts with detailed insights
                </p>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  )
}
