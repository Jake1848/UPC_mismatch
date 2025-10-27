'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, FileCheck, Zap } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { GradientMesh } from '@/components/ui/particle-background'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <GradientMesh />
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <nav className="flex justify-between items-center mb-20">
          <div className="text-2xl font-bold text-white">
            UPC Resolver
          </div>
          <AnimatedButton
            variant="primary"
            ripple
            onClick={() => window.location.href = '/login'}
          >
            Sign In
          </AnimatedButton>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-6xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Enterprise UPC Conflict Resolution
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl text-slate-300 mb-12"
          >
            Detect, analyze, and resolve UPC conflicts across your entire inventory with AI-powered precision
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex gap-4 justify-center"
          >
            <AnimatedButton
              variant="gradient"
              ripple
              glow
              onClick={() => window.location.href = '/register'}
              className="px-8 py-4 flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </AnimatedButton>
            <AnimatedButton
              variant="secondary"
              ripple
              onClick={() => window.location.href = '/demo'}
              className="px-8 py-4"
            >
              View Demo
            </AnimatedButton>
          </motion.div>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <AnimatedCard variant="glass" hover3D glowOnHover className="p-8 h-full">
              <FileCheck className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                File Processing
              </h3>
              <p className="text-slate-400">
                Upload and process large CSV/Excel files with intelligent conflict detection
              </p>
            </AnimatedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            <AnimatedCard variant="glass" hover3D glowOnHover className="p-8 h-full">
              <BarChart3 className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-slate-400">
                Real-time insights and visualizations for conflict trends and resolution rates
              </p>
            </AnimatedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <AnimatedCard variant="glass" hover3D glowOnHover className="p-8 h-full">
              <Zap className="w-12 h-12 text-pink-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered
              </h3>
              <p className="text-slate-400">
                Machine learning algorithms automatically suggest optimal conflict resolutions
              </p>
            </AnimatedCard>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 border-t border-slate-800">
        <div className="text-center text-slate-500">
          © 2025 UPC Resolver V2. Built with Next.js 14 + Express + PostgreSQL
        </div>
      </div>
    </div>
  );
}
