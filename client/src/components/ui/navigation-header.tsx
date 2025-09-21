"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  DocumentChartBarIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EnhancedCard } from "./enhanced-card"
import { ThemeToggle } from "./theme-toggle"

export const NavigationHeader: React.FC = () => {
  return (
    <EnhancedCard className="mb-8">
      <div className="p-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <DocumentChartBarIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">UPC Resolver Pro</h1>
              <p className="text-sm text-muted-foreground">Advanced Warehouse Analytics</p>
            </div>
          </motion.div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search conflicts, UPCs..." className="pl-10 w-64 bg-background/50 border-border/50" />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <BellIcon className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-destructive">
                3
              </Badge>
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="icon">
              <Cog6ToothIcon className="w-5 h-5" />
            </Button>

            {/* Profile */}
            <Button variant="ghost" size="icon">
              <UserCircleIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </EnhancedCard>
  )
}
