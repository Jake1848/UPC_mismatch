import React from 'react'

export function FileUpload() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p className="text-gray-600">File upload component</p>
      <input type="file" className="mt-4" accept=".csv,.xlsx,.xls" />
    </div>
  )
}
