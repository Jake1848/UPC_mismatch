"use client"
import { motion } from "framer-motion"
import { NavigationHeader } from "@/components/ui/navigation-header"
import { StatsGrid } from "@/components/ui/stats-grid"
import { ActivityFeed } from "@/components/ui/activity-feed"
import { EnhancedCard } from "@/components/ui/enhanced-card"
import { Button } from "@/components/ui/button"
import { CloudArrowUpIcon, ChartBarIcon, CogIcon, DocumentTextIcon } from "@heroicons/react/24/outline"

const quickActions = [
  {
    title: "Upload Data",
    description: "Import warehouse inventory files",
    icon: CloudArrowUpIcon,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    title: "View Analytics",
    description: "Detailed conflict analysis reports",
    icon: ChartBarIcon,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  {
    title: "System Settings",
    description: "Configure detection rules",
    icon: CogIcon,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    title: "Export Reports",
    description: "Generate compliance documents",
    icon: DocumentTextIcon,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <NavigationHeader />

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatsGrid />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <EnhancedCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <Button variant="ghost" className="w-full h-auto p-4 justify-start hover:bg-background/50">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-lg ${action.bgColor}`}>
                            <action.icon className={`w-6 h-6 ${action.color}`} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">{action.title}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </EnhancedCard>
          </motion.div>

          {/* Activity Feed */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <ActivityFeed />
          </motion.div>
        </div>

        {/* System Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <EnhancedCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">System Status</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">All Systems Operational</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">&lt; 100ms</div>
                  <div className="text-sm text-muted-foreground">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">1.2M</div>
                  <div className="text-sm text-muted-foreground">Records Processed</div>
                </div>
              </div>
            </div>
          </EnhancedCard>
        </motion.div>
      </div>
    </div>
  )
}
