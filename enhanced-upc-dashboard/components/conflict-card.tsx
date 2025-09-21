"use client"

import type React from "react"
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline"
import type { Conflict } from "../../types"
import { GlassCard } from "../ui/GlassCard"
import { formatDistanceToNow } from "date-fns"

interface ConflictCardProps {
  conflict: Conflict
  onClick?: () => void
  showAssignment?: boolean
  compact?: boolean
}

export const ConflictCard: React.FC<ConflictCardProps> = ({
  conflict,
  onClick,
  showAssignment = true,
  compact = false,
}) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case "HIGH":
        return <ShieldExclamationIcon className="w-5 h-5 text-orange-500" />
      case "MEDIUM":
        return <InformationCircleIcon className="w-5 h-5 text-yellow-500" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
      case "HIGH":
        return "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200"
      case "MEDIUM":
        return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
      default:
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case "IN_PROGRESS":
        return <ClockIcon className="w-4 h-4 text-blue-500 animate-pulse" />
      case "REJECTED":
        return <XCircleIcon className="w-4 h-4 text-gray-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "text-green-600 dark:text-green-400"
      case "IN_PROGRESS":
        return "text-blue-600 dark:text-blue-400"
      case "REJECTED":
        return "text-gray-600 dark:text-gray-400"
      default:
        return "text-yellow-600 dark:text-yellow-400"
    }
  }

  const formatConflictType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <GlassCard hover={!!onClick} onClick={onClick} className={`${compact ? "p-4" : "p-6"} cursor-pointer`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {getSeverityIcon(conflict.severity)}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatConflictType(conflict.type)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">UPC: {conflict.upc}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(conflict.severity)}`}
            >
              {conflict.severity}
            </span>
          </div>
        </div>

        {/* Conflict Details */}
        {!compact && (
          <div className="space-y-2">
            {conflict.description && <p className="text-sm text-gray-700 dark:text-gray-300">{conflict.description}</p>}

            {conflict.details && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {Object.entries(conflict.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="font-medium">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cost Impact */}
        {conflict.costImpact && conflict.costImpact > 0 && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <CurrencyDollarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Estimated Cost Impact</p>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">
                ${conflict.costImpact.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Status and Assignment */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStatusIcon(conflict.status)}
            <span className={`font-medium ${getStatusColor(conflict.status)}`}>
              {conflict.status.replace(/_/g, " ")}
            </span>
          </div>

          {showAssignment && (
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              {conflict.assignedTo ? (
                <>
                  <UserIcon className="w-4 h-4" />
                  <span>{conflict.assignedTo.name || conflict.assignedTo.email}</span>
                </>
              ) : (
                <span className="italic">Unassigned</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Created {formatDistanceToNow(new Date(conflict.createdAt))} ago</span>
          {conflict.resolvedAt && <span>Resolved {formatDistanceToNow(new Date(conflict.resolvedAt))} ago</span>}
        </div>

        {/* Resolution Notes */}
        {conflict.resolutionNotes && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Resolution Notes</p>
            <p className="text-sm text-green-700 dark:text-green-300">{conflict.resolutionNotes}</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
