"use client"

import type React from "react"
import { motion } from "framer-motion"
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline"
import { useTheme } from "../../hooks/use-theme"

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md border border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === "dark" ? 180 : 0,
          opacity: 1,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative w-6 h-6"
      >
        {theme === "light" ? (
          <SunIcon className="w-6 h-6 text-yellow-500" />
        ) : (
          <MoonIcon className="w-6 h-6 text-blue-300" />
        )}
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: theme === "dark" ? "0 0 20px rgba(59, 130, 246, 0.3)" : "0 0 20px rgba(245, 158, 11, 0.3)",
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}

export default ThemeToggle
