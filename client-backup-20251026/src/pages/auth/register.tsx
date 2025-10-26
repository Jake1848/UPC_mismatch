import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import Link from 'next/link'

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    organizationName: '',
    organizationSlug: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.organizationName) newErrors.organizationName = 'Organization name is required'

    if (!formData.organizationSlug && formData.organizationName) {
      const slug = formData.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData(prev => ({ ...prev, organizationSlug: slug }))
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        organizationName: formData.organizationName,
        organizationSlug: formData.organizationSlug || undefined
      })
    } catch (error: any) {
      if (error.response?.data?.field) {
        setErrors({ [error.response.data.field]: error.response.data.message })
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    if (name === 'organizationName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData(prev => ({ ...prev, organizationSlug: slug }))
    }
  }

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
    { met: /\d/.test(formData.password), text: 'One number' }
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Modern branding section */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

        {/* Floating geometric shapes */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-32 left-16 w-28 h-28 border border-primary/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-40 right-20 w-20 h-20 bg-secondary/10 rounded-2xl"
          />
          <motion.div
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/4 w-12 h-12 border-2 border-primary/30 rounded-lg"
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary-foreground rounded-sm" />
                </div>
                <span className="text-2xl font-bold text-foreground">UPC Resolver</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
                Start your free trial today
              </h1>
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Join 500+ warehouses already using our AI-powered platform to resolve conflicts faster and more accurately.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-muted-foreground">14-day free trial</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-muted-foreground">No credit card required</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-muted-foreground">Setup in under 5 minutes</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 lg:max-w-lg xl:max-w-xl">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 bg-primary-foreground rounded-sm" />
              </div>
              <span className="text-xl font-bold text-foreground">UPC Resolver</span>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="absolute top-6 right-6">
            <ThemeToggle />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
              <p className="text-muted-foreground">
                Get started with your free trial
              </p>
            </div>

            <Card className="p-6 border-0 shadow-xl bg-card/50 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="work@company.com"
                      disabled={loading}
                      className={`h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="Your company name"
                    disabled={loading}
                    className={`h-11 ${errors.organizationName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errors.organizationName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive"
                    >
                      {errors.organizationName}
                    </motion.p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create password"
                        disabled={loading}
                        className={`h-11 pr-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        disabled={loading}
                        className={`h-11 pr-11 ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive"
                      >
                        {errors.confirmPassword}
                      </motion.p>
                    )}
                  </div>
                </div>

                {formData.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-muted/50 rounded-lg border"
                  >
                    <p className="text-sm font-medium text-foreground mb-3">
                      Password Requirements:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                            req.met ? 'bg-primary text-primary-foreground' : 'bg-muted border'
                          }`}>
                            {req.met && <CheckIcon className="w-2.5 h-2.5" />}
                          </div>
                          <span className={`text-xs transition-colors ${
                            req.met ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="text-xs text-muted-foreground">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded border-input" required />
                    <span>
                      I agree to the{' '}
                      <Link href="#" className="text-primary hover:text-primary/80 font-medium">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="#" className="text-primary hover:text-primary/80 font-medium">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-medium"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}