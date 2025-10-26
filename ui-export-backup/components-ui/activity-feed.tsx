"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline"
import { EnhancedCard } from "./enhanced-card"
import { Badge } from "@/components/ui/badge"

interface ActivityItem {
  id: string
  type: "resolved" | "detected" | "assigned" | "uploaded"
  title: string
  description: string
  timestamp: string
  user?: string
  severity?: "high" | "medium" | "low"
}

const activities: ActivityItem[] = [
  {
    id: "1",
    type: "resolved",
    title: "UPC Conflict Resolved",
    description: "Duplicate UPC 123456789012 resolved for Product SKU-001",
    timestamp: "2 minutes ago",
    user: "Sarah Chen",
  },
  {
    id: "2",
    type: "detected",
    title: "New Conflict Detected",
    description: "Price mismatch detected for UPC 987654321098",
    timestamp: "5 minutes ago",
    severity: "high",
  },
  {
    id: "3",
    type: "assigned",
    title: "Conflict Assigned",
    description: "Critical inventory conflict assigned to Mike Johnson",
    timestamp: "12 minutes ago",
    user: "System",
  },
  {
    id: "4",
    type: "uploaded",
    title: "Data Upload Complete",
    description: "warehouse_inventory_2024.xlsx processed successfully",
    timestamp: "1 hour ago",
    user: "Alex Rodriguez",
  },
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case "resolved":
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />
    case "detected":
      return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />
    case "assigned":
      return <UserIcon className="w-5 h-5 text-blue-400" />
    case "uploaded":
      return <DocumentIcon className="w-5 h-5 text-purple-400" />
    default:
      return <ClockIcon className="w-5 h-5 text-gray-400" />
  }
}

export const ActivityFeed: React.FC = () => {
  return (
    <EnhancedCard>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>

        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 rounded-lg bg-background/30 border border-border/50 hover:bg-background/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                  {activity.severity && (
                    <Badge
                      variant={activity.severity === "high" ? "destructive" : "secondary"}
                      className="text-xs ml-2"
                    >
                      {activity.severity}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                  {activity.user && <span className="text-xs text-muted-foreground">by {activity.user}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </EnhancedCard>
  )
}
