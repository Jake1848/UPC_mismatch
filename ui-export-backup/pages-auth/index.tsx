import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheckIcon,
  ChartBarIcon,
  CpuChipIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          router.push('/auth/login')
          return 100
        }
        return Math.min(oldProgress + 2, 100)
      })
    }, 50)

    return () => clearInterval(timer)
  }, [router])

  const features = [
    {
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and compliance',
    },
    {
      icon: <ChartBarIcon className="h-6 w-6" />,
      title: 'Real-time Analytics',
      description: 'Advanced conflict detection and reporting',
    },
    {
      icon: <CpuChipIcon className="h-6 w-6" />,
      title: 'AI-Powered',
      description: 'Machine learning conflict resolution',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8"
        >
          <Card className="border-white/10 bg-background/50">
            <CardHeader className="space-y-6 pb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
                  Enterprise SaaS Platform
                </Badge>
                <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-6">
                  UPC Conflict Resolver
                </h1>
                <CardDescription className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Advanced warehouse inventory management with AI-powered conflict detection and resolution.
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid md:grid-cols-3 gap-6"
              >
                {features.map((feature, index) => (
                  <Card key={index} className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Initializing secure connection...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-center space-x-2">
                  <Button onClick={() => router.push('/auth/login')} size="lg" className="px-8">
                    Access Platform
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

