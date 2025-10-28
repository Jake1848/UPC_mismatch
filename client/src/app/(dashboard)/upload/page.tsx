'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Play } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
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
    console.log('═══════════════════════════════════════════════════')
    console.log('📤 [UPLOAD PAGE] ======= FILE INPUT CHANGE EVENT FIRED =======')
    console.log('📤 [UPLOAD PAGE] Event:', e)
    console.log('📤 [UPLOAD PAGE] Target:', e.target)
    console.log('📤 [UPLOAD PAGE] Files object:', e.target.files)
    console.log('📤 [UPLOAD PAGE] Files count:', e.target.files?.length)
    console.log('═══════════════════════════════════════════════════')

    if (e.target.files && e.target.files.length > 0) {
      console.log('✅ Files detected, processing...')
      const fileArray = Array.from(e.target.files)
      console.log('📤 [UPLOAD PAGE] Files array:', fileArray.map(f => f.name))
      handleFiles(fileArray)
    } else {
      console.error('❌ No files found in input')
    }
  }

  const handleFiles = async (files: File[]) => {
    console.log('═══════════════════════════════════════════════════')
    console.log('📤 [UPLOAD PAGE] ======= HANDLE FILES CALLED =======')
    console.log('📤 [UPLOAD PAGE] Files received:', files.length)
    console.log('📤 [UPLOAD PAGE] File names:', files.map(f => f.name))
    console.log('═══════════════════════════════════════════════════')

    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const isValid = extension === 'csv' || extension === 'xlsx' || extension === 'xls'
      console.log(`📤 [UPLOAD PAGE] ${file.name} -> ${extension} -> ${isValid ? '✅ VALID' : '❌ INVALID'}`)
      return isValid
    })

    console.log('📤 [UPLOAD PAGE] Valid files count:', validFiles.length)

    if (validFiles.length === 0) {
      console.error('❌ No valid files found!')
      alert('Please upload CSV or Excel files (.csv, .xlsx, .xls)')
      return
    }

    // Process each file immediately - add to state and start processing
    for (const file of validFiles) {
      const fileId = Math.random().toString(36).substring(7)
      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        status: 'processing',  // Start as processing immediately
        progress: 10
      }

      console.log('📤 [UPLOAD PAGE] ✅ Adding file to queue:', file.name, 'ID:', fileId)
      console.log('📤 [UPLOAD PAGE] Starting immediate analysis...')

      setUploadedFiles(prev => [...prev, uploadedFile])

      // Start processing immediately with file object
      processFileDirectly(fileId, file)
    }

    console.log('📤 [UPLOAD PAGE] ✅ All files added and processing started')
  }

  const processFileDirectly = async (fileId: string, file: File) => {
    console.log('═══════════════════════════════════════════════════')
    console.log('📤 [UPLOAD PAGE] ======= PROCESSING FILE DIRECTLY =======')
    console.log('📤 [UPLOAD PAGE] File:', file.name)
    console.log('📤 [UPLOAD PAGE] Size:', (file.size / 1024).toFixed(2), 'KB')
    console.log('📤 [UPLOAD PAGE] Type:', file.type)
    console.log('═══════════════════════════════════════════════════')

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension === 'csv') {
        console.log('📤 [UPLOAD PAGE] Parsing CSV file...')
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('📤 [UPLOAD PAGE] CSV parsed:', results.data.length, 'rows')
            processData(fileId, results.data as UPCRow[], file.name)
          },
          error: (error) => {
            console.error('📤 [UPLOAD PAGE] ❌ CSV parse error:', error)
            setUploadedFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error', error: error.message } : f
            ))
          }
        })
      } else if (extension === 'xlsx' || extension === 'xls') {
        console.log('📤 [UPLOAD PAGE] Parsing Excel file...')
        const reader = new FileReader()

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })

            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]

            const jsonData = XLSX.utils.sheet_to_json(worksheet)
            console.log('📤 [UPLOAD PAGE] Excel parsed:', jsonData.length, 'rows')

            processData(fileId, jsonData as UPCRow[], file.name)
          } catch (error: any) {
            console.error('📤 [UPLOAD PAGE] ❌ Excel parse error:', error)
            setUploadedFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error', error: error.message } : f
            ))
          }
        }

        reader.onerror = (error) => {
          console.error('📤 [UPLOAD PAGE] ❌ File read error:', error)
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error', error: 'Failed to read file' } : f
          ))
        }

        reader.readAsArrayBuffer(file)
      }
    } catch (error: any) {
      console.error('📤 [UPLOAD PAGE] ❌ Processing error:', error)
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error', error: error.message } : f
      ))
    }
  }

  const processFile = async (fileId: string) => {
    const fileObj = uploadedFiles.find(f => f.id === fileId)
    if (!fileObj) {
      console.error('📤 [UPLOAD PAGE] File not found:', fileId)
      return
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('📤 [UPLOAD PAGE] ======= PROCESSING FILE =======')
    console.log('📤 [UPLOAD PAGE] File:', fileObj.file.name)
    console.log('📤 [UPLOAD PAGE] Size:', (fileObj.file.size / 1024).toFixed(2), 'KB')
    console.log('📤 [UPLOAD PAGE] Type:', fileObj.file.type)
    console.log('═══════════════════════════════════════════════════')

    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'processing', progress: 10 } : f
    ))

    try {
      const extension = fileObj.file.name.split('.').pop()?.toLowerCase()

      if (extension === 'csv') {
        // Parse CSV
        console.log('📤 [UPLOAD PAGE] Parsing CSV file...')
        Papa.parse(fileObj.file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('📤 [UPLOAD PAGE] CSV parsed:', results.data.length, 'rows')
            processData(fileId, results.data as UPCRow[], fileObj.file.name)
          },
          error: (error) => {
            console.error('📤 [UPLOAD PAGE] ❌ CSV parse error:', error)
            setUploadedFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error', error: error.message } : f
            ))
          }
        })
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        console.log('📤 [UPLOAD PAGE] Parsing Excel file...')
        const reader = new FileReader()

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })

            // Get first sheet
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet)
            console.log('📤 [UPLOAD PAGE] Excel parsed:', jsonData.length, 'rows')

            processData(fileId, jsonData as UPCRow[], fileObj.file.name)
          } catch (error: any) {
            console.error('📤 [UPLOAD PAGE] ❌ Excel parse error:', error)
            setUploadedFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error', error: error.message } : f
            ))
          }
        }

        reader.onerror = (error) => {
          console.error('📤 [UPLOAD PAGE] ❌ File read error:', error)
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error', error: 'Failed to read file' } : f
          ))
        }

        reader.readAsArrayBuffer(fileObj.file)
      }
    } catch (error: any) {
      console.error('📤 [UPLOAD PAGE] ❌ Processing error:', error)
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error', error: error.message } : f
      ))
    }
  }

  const processData = (fileId: string, data: UPCRow[], fileName: string) => {
    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, progress: 40 } : f
    ))

    // Detect conflicts
    const conflicts = detectConflicts(data)
    console.log('📤 [UPLOAD PAGE] Conflicts detected:', conflicts.length)

    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, progress: 70 } : f
    ))

    // Save analysis to localStorage
    const analysisId = 'analysis_' + Date.now()
    const savedAnalyses = JSON.parse(localStorage.getItem('upc_analyses') || '[]')
    const newAnalysis = {
      id: analysisId,
      fileName,
      status: 'COMPLETED',
      conflictsFound: conflicts.length,
      totalRows: data.length,
      conflicts,
      data,
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
            rowCount: data.length,
            conflictCount: conflicts.length
          }
        : f
    ))
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
      console.warn('🔍 [CONFLICT DETECTION] Available columns:', Object.keys(firstRow))
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
    console.log('📤 [UPLOAD PAGE] Removing file:', fileId)
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
            Upload CSV or Excel files to detect UPC conflicts in real-time
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Zone - SIMPLIFIED WITHOUT AnimatedCard */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-12">
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

              <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-white mb-2">
                {dragActive ? 'Drop your files here' : 'Upload CSV or Excel Files'}
              </h3>

              <p className="text-slate-400 mb-6">
                Drag and drop files here, or click to browse
              </p>

              <button
                type="button"
                onClick={(e) => {
                  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥')
                  console.log('📤 [UPLOAD PAGE] ======= BUTTON CLICKED =======')
                  console.log('📤 [UPLOAD PAGE] Event:', e)
                  console.log('📤 [UPLOAD PAGE] Looking for input element...')
                  const input = document.getElementById('file-upload') as HTMLInputElement
                  console.log('📤 [UPLOAD PAGE] Input element found:', !!input)
                  if (input) {
                    console.log('📤 [UPLOAD PAGE] Input type:', input.type)
                    console.log('📤 [UPLOAD PAGE] Triggering click on input...')
                    input.click()
                    console.log('📤 [UPLOAD PAGE] Input click triggered!')
                  } else {
                    console.error('❌ Input element not found!')
                  }
                  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥')
                }}
                style={{
                  position: 'relative',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                🚀 SELECT FILES 🚀
              </button>

              <p className="text-sm text-slate-500 mt-4">
                CSV, XLSX, XLS • Unlimited file size • Processed locally in your browser
              </p>
            </div>
          </div>

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
                          onClick={() => {
                            console.log('📤 [UPLOAD PAGE] ======= ANALYZE BUTTON CLICKED =======')
                            console.log('📤 [UPLOAD PAGE] File ID:', file.id)
                            processFile(file.id)
                          }}
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
            <h3 className="font-semibold text-white mb-4">✨ What We Detect</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <div>
                  <strong>Duplicate UPCs:</strong> Same barcode appearing multiple times
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <div>
                  <strong>Invalid Formats:</strong> Non-numeric or wrong-length UPCs
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <div>
                  <strong>Missing Data:</strong> Empty UPC fields
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <div>
                  <strong>Price Mismatches:</strong> Same UPC with different prices
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  )
}
