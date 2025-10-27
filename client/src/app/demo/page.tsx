'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { FloatingOrbs } from '@/components/ui/particle-background'
import { motion } from 'framer-motion'

export default function DemoPage() {
  useEffect(() => {
    console.log('🎬 [DEMO PAGE] Component mounted')
    console.log('🎬 [DEMO PAGE] Current URL:', window.location.href)
    console.log('🎬 [DEMO PAGE] Current pathname:', window.location.pathname)

    return () => {
      console.log('🎬 [DEMO PAGE] Component unmounted')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <FloatingOrbs orbCount={5} />

      <div className="container mx-auto px-4 py-20 relative z-10">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-20">
          <Link href="/" className="text-2xl font-bold text-white">
            UPC Resolver
          </Link>
          <div className="flex gap-4">
            <AnimatedButton
              variant="secondary"
              ripple
              onClick={() => {
                console.log('🎬 [DEMO PAGE] Sign In button clicked')
                window.location.href = '/login'
              }}
            >
              Sign In
            </AnimatedButton>
            <AnimatedButton
              variant="gradient"
              ripple
              glow
              onClick={() => {
                console.log('🎬 [DEMO PAGE] Get Started button clicked')
                window.location.href = '/register'
              }}
            >
              Get Started
            </AnimatedButton>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6"
          >
            <Play className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-semibold">Interactive Demo</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            See UPC Resolver in Action
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-300 mb-8"
          >
            Watch how our AI-powered system detects, analyzes, and resolves UPC conflicts in real-time
          </motion.p>
        </motion.div>

        {/* Demo Video/Screenshot Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-5xl mx-auto mb-16"
        >
          <AnimatedCard variant="glass" hover3D className="p-8">
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="w-20 h-20 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Demo Video Coming Soon</h3>
                <p className="text-slate-400">
                  Sign up now to get full access to the platform
                </p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Demo Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AnimatedCard variant="glass" hover3D className="p-6 h-full">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Your Data</h3>
              <p className="text-slate-400">
                Upload CSV or Excel files with your inventory data. Our system supports files up to 100MB.
              </p>
            </AnimatedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <AnimatedCard variant="glass" hover3D className="p-6 h-full">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-slate-400">
                Our AI instantly analyzes your data, detecting duplicates, format errors, and conflicts.
              </p>
            </AnimatedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <AnimatedCard variant="glass" hover3D className="p-6 h-full">
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-pink-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Resolve & Export</h3>
              <p className="text-slate-400">
                Review conflicts, apply bulk resolutions, and export clean data ready for production.
              </p>
            </AnimatedCard>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <AnimatedCard variant="gradient" className="p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to resolve your UPC conflicts?
            </h2>
            <p className="text-slate-300 mb-8">
              Join hundreds of companies already using UPC Resolver to maintain clean inventory data
            </p>
            <AnimatedButton
              variant="primary"
              ripple
              glow
              onClick={() => {
                console.log('🎬 [DEMO PAGE] Start Free Trial button clicked')
                window.location.href = '/register'
              }}
              className="px-8 py-4 text-lg flex items-center gap-2 mx-auto"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </AnimatedButton>
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  )
}
