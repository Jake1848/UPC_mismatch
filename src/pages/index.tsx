import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page after a brief delay
    const timer = setTimeout(() => {
      router.push('/auth/login')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 shadow-2xl"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            UPC Conflict Resolver
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            Enterprise SaaS for Warehouse Inventory Management
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-blue-200"
          >
            Redirecting to login...
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}