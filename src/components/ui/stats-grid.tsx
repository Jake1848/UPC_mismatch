"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  ArrowTrendingUpIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline"
import { EnhancedCard } from "./enhanced-card"

interface StatItem {
  label: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const stats: StatItem[] = [
  {
    label: "Conflicts Resolved",
    value: "2,847",
    change: "+12%",
    trend: "up",
    icon: CheckCircleIcon,
    color: "text-green-400",
  },
  {
    label: "Processing Time",
    value: "1.2s",
    change: "-45%",
    trend: "up",
    icon: ClockIcon,
    color: "text-blue-400",
  },
  {
    label: "Accuracy Rate",
    value: "99.8%",
    change: "+0.3%",
    trend: "up",
    icon: ShieldCheckIcon,
    color: "text-purple-400",
  },
  {
    label: "Active Conflicts",
    value: "23",
    change: "-8",
    trend: "up",
    icon: ExclamationTriangleIcon,
    color: "text-orange-400",
  },
]

export const StatsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <EnhancedCard key={stat.label} delay={index * 0.1} glow>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.change && (
                <div
                  className={`flex items-center space-x-1 text-sm ${
                    stat.trend === "up" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span>{stat.change}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="text-2xl font-bold text-foreground"
              >
                {stat.value}
              </motion.div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </EnhancedCard>
      ))}
    </div>
  )
}
