import React from 'react'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log('[FileUpload] File selected:', e.target.files[0].name)
      // In production, this would upload to API
      // For now, just call the callback
      if (onUploadComplete) {
        console.log('[FileUpload] Upload complete callback triggered')
        onUploadComplete()
      }
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p className="text-gray-600">File upload component</p>
      <input
        type="file"
        className="mt-4"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />
    </div>
  )
}
