import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface AnalysisResult {
  id: string
  type: 'conflict' | 'fraud' | 'categorization'
  status: 'processing' | 'completed' | 'failed'
  confidence: number
  result: any
  createdAt: string
}

export default function AIAnalysisPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [testData, setTestData] = useState({
    upc: '123456789012',
    productName: 'Test Product',
    description: 'A sample product for AI analysis'
  })

  const runConflictAnalysis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/ai/analyze-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          upc: testData.upc,
          productName: testData.productName,
          description: testData.description,
          conflictContext: 'Testing AI conflict analysis',
          existingData: [
            { name: 'Product A', price: 99 },
            { name: 'Product B', price: 199 }
          ]
        })
      })

      const data = await response.json()

      if (data.success) {
        const newAnalysis: AnalysisResult = {
          id: Date.now().toString(),
          type: 'conflict',
          status: 'completed',
          confidence: data.analysis.confidence,
          result: data.analysis,
          createdAt: new Date().toISOString()
        }
        setAnalyses(prev => [newAnalysis, ...prev])
        toast.success('Conflict analysis completed!')
      } else {
        toast.error('Analysis failed')
      }
    } catch (error) {
      toast.error('Failed to run analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const runFraudDetection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/ai/detect-fraud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          upcData: [
            { upc: testData.upc, name: testData.productName, price: 50 },
            { upc: testData.upc, name: testData.productName, price: 1200 }
          ]
        })
      })

      const data = await response.json()

      if (data.success) {
        const newAnalysis: AnalysisResult = {
          id: Date.now().toString(),
          type: 'fraud',
          status: 'completed',
          confidence: 100 - data.fraudAnalysis.fraudScore,
          result: data.fraudAnalysis,
          createdAt: new Date().toISOString()
        }
        setAnalyses(prev => [newAnalysis, ...prev])
        toast.success('Fraud detection completed!')
      } else {
        toast.error('Analysis failed')
      }
    } catch (error) {
      toast.error('Failed to run fraud detection')
    } finally {
      setIsLoading(false)
    }
  }

  const runCategorization = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/ai/categorize-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          upc: testData.upc,
          name: testData.productName,
          description: testData.description
        })
      })

      const data = await response.json()

      if (data.success) {
        const newAnalysis: AnalysisResult = {
          id: Date.now().toString(),
          type: 'categorization',
          status: 'completed',
          confidence: data.categorization.confidence,
          result: data.categorization,
          createdAt: new Date().toISOString()
        }
        setAnalyses(prev => [newAnalysis, ...prev])
        toast.success('Product categorization completed!')
      } else {
        toast.error('Analysis failed')
      }
    } catch (error) {
      toast.error('Failed to run categorization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Analysis Center</h1>
            <p className="text-purple-100 mt-2">
              Powered by Claude 3.5 Sonnet for intelligent UPC conflict resolution
            </p>
          </div>
        </div>
      </div>

      {/* Test Data Input */}
      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="upc">UPC</Label>
              <Input id="upc" value={testData.upc} onChange={(e) => setTestData(prev => ({ ...prev, upc: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input id="productName" value={testData.productName} onChange={(e) => setTestData(prev => ({ ...prev, productName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={testData.description} onChange={(e) => setTestData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button onClick={runConflictAnalysis} disabled={isLoading} className="h-auto py-6 text-left justify-start bg-gradient-to-r from-blue-500 to-cyan-400">
          <div>
            <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
            <div className="font-bold">Conflict Analysis</div>
            <div className="text-sm opacity-80">AI-powered conflict resolution with Claude</div>
          </div>
        </Button>
        <Button onClick={runFraudDetection} disabled={isLoading} className="h-auto py-6 text-left justify-start bg-gradient-to-r from-red-500 to-orange-400">
          <div>
            <ShieldCheckIcon className="w-8 h-8 mb-2" />
            <div className="font-bold">Fraud Detection</div>
            <div className="text-sm opacity-80">Detect suspicious UPC patterns</div>
          </div>
        </Button>
        <Button onClick={runCategorization} disabled={isLoading} className="h-auto py-6 text-left justify-start bg-gradient-to-r from-green-500 to-emerald-400">
          <div>
            <ChartBarIcon className="w-8 h-8 mb-2" />
            <div className="font-bold">Auto-Categorization</div>
            <div className="text-sm opacity-80">Intelligent product categorization</div>
          </div>
        </Button>
      </div>

      {/* Analysis Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end mb-3">
          {isLoading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          </div>

        {analyses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CpuChipIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No analysis results yet. Run an AI analysis to see results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      analysis.type === 'conflict' ? 'bg-blue-100 text-blue-600' :
                      analysis.type === 'fraud' ? 'bg-red-100 text-red-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {analysis.type === 'conflict' && <ExclamationTriangleIcon className="w-5 h-5" />}
                      {analysis.type === 'fraud' && <ShieldCheckIcon className="w-5 h-5" />}
                      {analysis.type === 'categorization' && <ChartBarIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground capitalize">
                        {analysis.type} Analysis
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(analysis.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      analysis.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {analysis.status === 'completed' ? (
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      {analysis.status}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {analysis.confidence}% confidence
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
                    {JSON.stringify(analysis.result, null, 2)}
                  </pre>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  )
}
