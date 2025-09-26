"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MagnifyingGlassIcon, ArrowsUpDownIcon, UserPlusIcon, CheckIcon } from "@heroicons/react/24/outline"
import { conflictsApi } from "../services/api"
import { useWebSocket } from "../services/websocket"
import type { Conflict } from "../types/index"
import { ConflictCard } from "./conflict-card"
// Inline glass card styling to avoid import issues
import { toast } from "react-hot-toast"

interface ConflictListProps {
  analysisId?: string
  onConflictClick?: (conflict: Conflict) => void
  showFilters?: boolean
  compact?: boolean
}

interface Filters {
  status: string
  severity: string
  type: string
  assignedTo: string
  search: string
}

interface SortConfig {
  field: keyof Conflict
  direction: "asc" | "desc"
}

export const ConflictList: React.FC<ConflictListProps> = ({
  analysisId,
  onConflictClick,
  showFilters = true,
  compact = false,
}) => {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>({
    status: "",
    severity: "",
    type: "",
    assignedTo: "",
    search: "",
  })
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "createdAt",
    direction: "desc",
  })
  const [bulkAssigning, setBulkAssigning] = useState(false)

  const webSocket = useWebSocket()

  useEffect(() => {
    loadConflicts()

    // Subscribe to real-time updates
    webSocket.on("conflict:new", handleNewConflict)
    webSocket.on("conflict:assigned", handleConflictAssigned)
    webSocket.on("conflict:resolved", handleConflictResolved)

    return () => {
      webSocket.off("conflict:new", handleNewConflict)
      webSocket.off("conflict:assigned", handleConflictAssigned)
      webSocket.off("conflict:resolved", handleConflictResolved)
    }
  }, [analysisId, filters, sortConfig])

  const loadConflicts = async () => {
    try {
      setLoading(true)
      const params = {
        ...filters,
        analysisId,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
      }

      const response = await conflictsApi.getAll(params)
      setConflicts(response.data.conflicts)
    } catch (error) {
      console.error("Failed to load conflicts:", error)
      toast.error("Failed to load conflicts")
    } finally {
      setLoading(false)
    }
  }

  const handleNewConflict = (data: any) => {
    if (!analysisId || data.conflict.analysisId === analysisId) {
      setConflicts((prev) => [data.conflict, ...prev])
    }
  }

  const handleConflictAssigned = (data: any) => {
    setConflicts((prev) =>
      prev.map((conflict) =>
        conflict.id === data.conflictId ? { ...conflict, assignedTo: data.assignedTo } : conflict,
      ),
    )
  }

  const handleConflictResolved = (data: any) => {
    setConflicts((prev) =>
      prev.map((conflict) =>
        conflict.id === data.conflictId
          ? { ...conflict, status: "RESOLVED", resolvedAt: new Date() }
          : conflict,
      ),
    )
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSort = (field: keyof Conflict) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleBulkAssign = async (assignedToId?: string) => {
    if (selectedConflicts.length === 0) return

    try {
      setBulkAssigning(true)
      await conflictsApi.bulkAssign(selectedConflicts, assignedToId)
      setSelectedConflicts([])
      toast.success(`${selectedConflicts.length} conflicts assigned successfully`)
      loadConflicts()
    } catch (error) {
      console.error("Bulk assign failed:", error)
      toast.error("Failed to assign conflicts")
    } finally {
      setBulkAssigning(false)
    }
  }

  const toggleConflictSelection = (conflictId: string) => {
    setSelectedConflicts((prev) =>
      prev.includes(conflictId) ? prev.filter((id) => id !== conflictId) : [...prev, conflictId],
    )
  }

  const selectAllConflicts = () => {
    setSelectedConflicts(selectedConflicts.length === conflicts.length ? [] : conflicts.map((c) => c.id))
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      {showFilters && (
        <div className="relative backdrop-blur-xl bg-white/25 dark:bg-gray-800/25 border border-white/20 dark:border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 hover:bg-white/30 dark:hover:bg-gray-800/30">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conflicts..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center space-x-4">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="px-3 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange("severity", e.target.value)}
                  className="px-3 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="">All Severity</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <button
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center space-x-1 px-3 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <ArrowsUpDownIcon className="w-4 h-4" />
                  <span>Sort</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedConflicts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800"
              >
                <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                  {selectedConflicts.length} conflicts selected
                </span>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBulkAssign()}
                    disabled={bulkAssigning}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    <span>Assign to Me</span>
                  </motion.button>
                  <button
                    onClick={() => setSelectedConflicts([])}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Conflicts List */}
      <div className="space-y-4">
        {/* Select All */}
        {!compact && conflicts.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllConflicts}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <div
                className={`w-4 h-4 rounded border-2 ${
                  selectedConflicts.length === conflicts.length
                    ? "bg-primary-600 border-primary-600"
                    : "border-gray-300 dark:border-gray-600"
                } flex items-center justify-center`}
              >
                {selectedConflicts.length === conflicts.length && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <span>Select All ({conflicts.length})</span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="relative backdrop-blur-xl bg-white/25 dark:bg-gray-800/25 border border-white/20 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                <div className="p-6 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                    <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && conflicts.length === 0 && (
          <div className="relative backdrop-blur-xl bg-white/25 dark:bg-gray-800/25 border border-white/20 dark:border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 hover:bg-white/30 dark:hover:bg-gray-800/30">
            <div className="p-12 text-center">
              <CheckIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No conflicts found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {Object.values(filters).some((f) => f)
                  ? "Try adjusting your filters to see more results."
                  : "Great! No conflicts detected in your data."}
              </p>
            </div>
          </div>
        )}

        {/* Conflicts */}
        <AnimatePresence>
          {conflicts.map((conflict, index) => (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
            >
              {!compact && (
                <button onClick={() => toggleConflictSelection(conflict.id)} className="absolute top-4 left-4 z-10">
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      selectedConflicts.includes(conflict.id)
                        ? "bg-primary-600 border-primary-600"
                        : "border-gray-300 dark:border-gray-600"
                    } flex items-center justify-center`}
                  >
                    {selectedConflicts.includes(conflict.id) && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )}

              <div className={!compact ? "ml-6" : ""}>
                <ConflictCard conflict={conflict} onClick={() => onConflictClick?.(conflict)} compact={compact} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
