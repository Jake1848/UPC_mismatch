import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface ParticleBackgroundProps {
  particleCount?: number
  particleColor?: string
  particleSize?: number
  speed?: number
  className?: string
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  particleColor = 'rgba(59, 130, 246, 0.5)',
  particleSize = 2,
  speed = 0.5,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle class
    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * speed
        this.vy = (Math.random() - 0.5) * speed
        this.size = Math.random() * particleSize + 1
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = particleColor
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Create particles
    const particles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${1 - distance / 150})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        })
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [particleCount, particleColor, particleSize, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}

// Floating orbs background
interface FloatingOrbsProps {
  orbCount?: number
  className?: string
}

export const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  orbCount = 5,
  className = ''
}) => {
  const orbs = Array.from({ length: orbCount }, (_, i) => ({
    id: i,
    size: Math.random() * 300 + 200,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5
  }))

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      {orbs.map(orb => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${
              ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][orb.id % 5]
            }, transparent)`
          }}
          animate={{
            x: [0, 100, -100, 0],
            y: [0, -100, 100, 0],
            scale: [1, 1.2, 0.8, 1]
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// Gradient mesh background
export const GradientMesh: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 0% 0%, hsla(217, 91%, 60%, 0.3) 0px, transparent 50%),
            radial-gradient(at 100% 0%, hsla(280, 100%, 70%, 0.3) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(168, 76%, 42%, 0.3) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(43, 74%, 66%, 0.3) 0px, transparent 50%)
          `
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  )
}

