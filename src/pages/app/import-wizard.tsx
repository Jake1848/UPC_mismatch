import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  TableCellsIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  fileType: string;
  preview: Record<string, any>[];
  columnTypes: Record<string, string>;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformation?: string;
}

const TARGET_FIELDS = [
  { value: 'upc', label: 'UPC/Barcode', required: true },
  { value: 'sku', label: 'SKU', required: true },
  { value: 'product_name', label: 'Product Name', required: true },
  { value: 'description', label: 'Description', required: false },
  { value: 'price', label: 'Price', required: false },
  { value: 'cost', label: 'Cost', required: false },
  { value: 'quantity', label: 'Quantity', required: false },
  { value: 'category', label: 'Category', required: false },
  { value: 'brand', label: 'Brand', required: false },
  { value: 'weight', label: 'Weight', required: false },
  { value: 'image_url', label: 'Image URL', required: false }
];

const TRANSFORMATIONS = [
  { value: '', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'remove_spaces', label: 'Remove Spaces' },
  { value: 'number', label: 'Convert to Number' }
];

export default function ImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    // Upload and parse file
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('organizationId', 'org_123'); // Replace with actual org ID

    try {
      const response = await fetch('/api/v1/files/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setParsedData(result.data);
        
        // Get suggested mappings
        const suggestResponse = await fetch('/api/v1/mappings/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceHeaders: result.data.headers,
            targetFields: TARGET_FIELDS.map(f => f.value)
          })
        });

        const suggestions = await suggestResponse.json();
        if (suggestions.success) {
          setMappings(suggestions.data);
        }

        setStep(2);
      }
    } catch (error) {
      console.error('File upload error:', error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'application/xml': ['.xml']
    },
    maxFiles: 1
  });

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings(prev => {
      const existing = prev.find(m => m.sourceColumn === sourceColumn);
      if (existing) {
        return prev.map(m =>
          m.sourceColumn === sourceColumn ? { ...m, targetField } : m
        );
      } else {
        return [...prev, { sourceColumn, targetField }];
      }
    });
  };

  const updateTransformation = (sourceColumn: string, transformation: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.sourceColumn === sourceColumn ? { ...m, transformation } : m
      )
    );
  };

  const validateMappings = async () => {
    try {
      const response = await fetch('/api/v1/validation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedData?.rows,
          rules: [] // Add validation rules
        })
      });

      const result = await response.json();
      if (result.success) {
        setValidationResults(result.data);
        setStep(3);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const startImport = async () => {
    setImporting(true);

    try {
      // Apply mappings
      const mappedResponse = await fetch('/api/v1/mappings/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedData?.rows,
          mappings
        })
      });

      const mappedData = await mappedResponse.json();

      // Import products
      const importResponse = await fetch('/api/v1/pim/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: mappedData.data
        })
      });

      const importResult = await importResponse.json();
      if (importResult.success) {
        setStep(4);
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Import Data
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload any file format and map your data seamlessly
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['Upload', 'Map Columns', 'Validate', 'Import'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step > index + 1
                      ? 'bg-green-500 text-white'
                      : step === index + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > index + 1 ? <CheckCircleIcon className="w-6 h-6" /> : index + 1}
                </div>
                <span className="ml-2 text-sm font-medium">{label}</span>
                {index < 3 && (
                  <div className="w-16 h-1 mx-4 bg-gray-200">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: step > index + 1 ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: File Upload */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8"
            >
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <input {...getInputProps()} />
                <ArrowUpTrayIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">
                  {isDragActive ? 'Drop your file here' : 'Upload your data file'}
                </h3>
                <p className="text-gray-500 mb-4">
                  Supports CSV, Excel, JSON, and XML files up to 50MB
                </p>
                <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Choose File
                </button>
              </div>

              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center"
                >
                  <DocumentIcon className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && parsedData && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center mb-6">
                <TableCellsIcon className="w-6 h-6 text-blue-500 mr-2" />
                <h2 className="text-2xl font-bold">Map Your Columns</h2>
              </div>

              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm">
                  <SparklesIcon className="w-4 h-4 inline mr-1" />
                  We've automatically suggested mappings based on your column names. Review and adjust as needed.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {parsedData.headers.map((header) => {
                  const mapping = mappings.find(m => m.sourceColumn === header);
                  return (
                    <div key={header} className="grid grid-cols-3 gap-4 items-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{header}</p>
                        <p className="text-sm text-gray-500">
                          {parsedData.columnTypes[header]}
                        </p>
                      </div>
                      <select
                        value={mapping?.targetField || ''}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                      >
                        <option value="">Skip this column</option>
                        {TARGET_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                      <select
                        value={mapping?.transformation || ''}
                        onChange={(e) => updateTransformation(header, e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                        disabled={!mapping?.targetField}
                      >
                        {TRANSFORMATIONS.map(t => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <ArrowLeftIcon className="w-5 h-5 mr-2" />
                  Back
                </button>
                <button
                  onClick={validateMappings}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                  Continue
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Validation */}
          {step === 3 && validationResults && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center mb-6">
                <ShieldCheckIcon className="w-6 h-6 text-green-500 mr-2" />
                <h2 className="text-2xl font-bold">Validation Results</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">
                    {validationResults.validRecords}
                  </p>
                  <p className="text-sm text-gray-600">Valid Records</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">
                    {validationResults.invalidRecords}
                  </p>
                  <p className="text-sm text-gray-600">Invalid Records</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-600">
                    {validationResults.warnings.length}
                  </p>
                  <p className="text-sm text-gray-600">Warnings</p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <ArrowLeftIcon className="w-5 h-5 mr-2" />
                  Back
                </button>
                <button
                  onClick={startImport}
                  disabled={importing}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Start Import'}
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 text-center"
            >
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Import Complete!</h2>
              <p className="text-gray-600 mb-6">
                Your data has been successfully imported into the system.
              </p>
              <button
                onClick={() => window.location.href = '/app/pim'}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                View Products
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

