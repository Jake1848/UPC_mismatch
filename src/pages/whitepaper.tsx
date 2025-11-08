import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DocumentTextIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  ShoppingCartIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

export default function WhitepaperPage() {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would send to your email service
    console.log('Download requested:', { email, company })
    setSubmitted(true)
    
    // Trigger download
    const link = document.createElement('a')
    link.href = '/UPC_Conflict_Resolver_Whitepaper.md'
    link.download = 'UPC_Conflict_Resolver_Whitepaper.md'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const highlights = [
    {
      icon: <ChartBarIcon className="h-6 w-6" />,
      title: "95% Time Reduction",
      description: "Import 1,000 products in 2 hours instead of 40"
    },
    {
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      title: "1,046% ROI",
      description: "Average return on investment in just 1.1 months"
    },
    {
      icon: <CheckCircleIcon className="h-6 w-6" />,
      title: "95% Error Reduction",
      description: "Eliminate costly data errors and conflicts"
    }
  ]

  const useCases = [
    {
      icon: <BuildingOfficeIcon className="h-5 w-5" />,
      title: "Retail",
      description: "Onboard suppliers 97% faster"
    },
    {
      icon: <ShoppingCartIcon className="h-5 w-5" />,
      title: "E-commerce",
      description: "Sync products across all channels"
    },
    {
      icon: <CubeIcon className="h-5 w-5" />,
      title: "Consumer Goods",
      description: "Manage seasonal inventory efficiently"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <DocumentTextIcon className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-6">
                The Hidden Costs of Inefficient Product Data Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                And How to Solve Them with Intelligent Automation
              </p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Download Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="glass-morphism-dark border-white/10 bg-background/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Download the Whitepaper</CardTitle>
                  <CardDescription>
                    Get instant access to our comprehensive 28-page whitepaper
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!submitted ? (
                    <form onSubmit={handleDownload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Your Company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg">
                        <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
                        Download Whitepaper
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        By downloading, you agree to receive occasional updates about our product.
                      </p>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Download Started!</h3>
                      <p className="text-muted-foreground mb-4">
                        Check your downloads folder for the whitepaper.
                      </p>
                      <Button onClick={() => setSubmitted(false)} variant="outline">
                        Download Again
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Key Highlights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-6"
            >
              <Card className="glass-morphism-dark border-white/10 bg-background/50">
                <CardHeader>
                  <CardTitle>What You'll Learn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {highlight.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{highlight.title}</h3>
                        <p className="text-sm text-muted-foreground">{highlight.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-morphism-dark border-white/10 bg-background/50">
                <CardHeader>
                  <CardTitle>Industry Use Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {useCases.map((useCase, index) => (
                      <div key={index} className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
                          {useCase.icon}
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{useCase.title}</h4>
                        <p className="text-xs text-muted-foreground">{useCase.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Content Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Card className="glass-morphism-dark border-white/10 bg-background/50">
              <CardHeader>
                <CardTitle className="text-2xl">Whitepaper Contents</CardTitle>
                <CardDescription>
                  A comprehensive guide to transforming your product data management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">Executive Summary</h4>
                        <p className="text-sm text-muted-foreground">Key metrics and comparison tables</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">The Problem</h4>
                        <p className="text-sm text-muted-foreground">The high cost of bad data ($15M/year)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">The Solution</h4>
                        <p className="text-sm text-muted-foreground">Intelligent automation features</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">Technical Architecture</h4>
                        <p className="text-sm text-muted-foreground">Visual diagrams and component breakdown</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">Use Cases</h4>
                        <p className="text-sm text-muted-foreground">Real-world scenarios with measurable results</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">ROI Analysis</h4>
                        <p className="text-sm text-muted-foreground">Complete financial calculations</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">Implementation Guide</h4>
                        <p className="text-sm text-muted-foreground">Phased approach for smooth deployment</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">References</h4>
                        <p className="text-sm text-muted-foreground">Industry research and citations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground mb-4">
              Ready to transform your product data management?
            </p>
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/auth/login'}>
              Schedule a Demo
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

