import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { FileUpload } from '../../components/upload/FileUpload'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UploadPage() {
  const router = useRouter()

  const handleUploadComplete = (analysisId: string) => {
    router.push(`/app/analysis/${analysisId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary-200/30 via-transparent to-transparent dark:from-primary-900/20" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-secondary-200/30 via-transparent to-transparent dark:from-secondary-900/20" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/10 dark:bg-gray-800/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 rounded-full bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Upload Data Files
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload your warehouse data for UPC conflict analysis
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-0">
              <FileUpload onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">File Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Files must contain UPC/barcode data</li>
                    <li>• Include warehouse or location identifiers</li>
                    <li>• CSV files should have headers in the first row</li>
                    <li>• Excel files can have multiple sheets (first sheet used)</li>
                    <li>• Maximum file size: 100MB</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">What Happens Next?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Smart column detection identifies data structure</li>
                    <li>• Files are processed for UPC conflicts</li>
                    <li>• Real-time progress updates via notifications</li>
                    <li>• Detailed analysis results with conflict breakdown</li>
                    <li>• Automatic team notifications for critical issues</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pro Tip:</strong> Our smart column detection works with any warehouse format. Upload as-is — we’ll handle the rest!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
