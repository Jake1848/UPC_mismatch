"use client"

import type React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface EnhancedCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  animate?: boolean
  delay?: number
  onClick?: () => void
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  className,
  hover = true,
  glow = false,
  animate = true,
  delay = 0,
  onClick,
}) => {
  const cardContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "glass-morphism",
        "transition-all duration-300 ease-out",
        hover && ["hover:scale-[1.02]", "hover:shadow-2xl", "hover:border-primary/20"],
        glow && "animate-glow",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full opacity-10 bg-gradient-to-r from-transparent via-primary/30 to-transparent transform rotate-45 translate-x-[-100%] animate-shimmer" />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
        whileHover={hover ? { y: -4 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {cardContent}
      </motion.div>
    )
  }

  return cardContent
}
