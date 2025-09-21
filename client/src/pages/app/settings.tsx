import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CogIcon,
  UserIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BellIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useAuth } from '../../hooks/useAuth'
import { billingApi, organizationApi } from '../../services/api'
import { GlassCard } from '../../components/ui/glass-card'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { toast } from 'react-hot-toast'

interface BillingInfo {
  subscription: any
  usage: any
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, organization, updateProfile, changePassword, isAdmin, checkTrialStatus } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [orgForm, setOrgForm] = useState({
    name: organization?.name || '',
    settings: organization?.settings || {}
  })

  const trialStatus = checkTrialStatus()

  useEffect(() => {
    if (activeTab === 'billing') {
      loadBillingInfo()
    }
  }, [activeTab])

  const loadBillingInfo = async () => {
    try {
      const [subscriptionRes, usageRes] = await Promise.all([
        billingApi.getSubscription(),
        organizationApi.getUsage()
      ])

      setBillingInfo({
        subscription: subscriptionRes.data,
        usage: usageRes.data
      })
    } catch (error) {
      console.error('Failed to load billing info:', error)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await updateProfile({
        name: profileForm.name
      })
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      toast.success('Password changed successfully')
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleOrgUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin()) {
      toast.error('Only admins can update organization settings')
      return
    }

    try {
      setLoading(true)
      await organizationApi.updateSettings(orgForm.settings)
      toast.success('Organization settings updated')
    } catch (error) {
      toast.error('Failed to update organization settings')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const response = await billingApi.createCheckout({
        planId: 'pro',
        billingEmail: user?.email || ''
      })
      window.location.href = response.data.url
    } catch (error) {
      toast.error('Failed to start checkout process')
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await billingApi.createPortalSession()
      window.location.href = response.data.url
    } catch (error) {
      toast.error('Failed to open billing portal')
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'password', name: 'Password', icon: KeyIcon },
    { id: 'organization', name: 'Organization', icon: BuildingOfficeIcon, adminOnly: true },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon, adminOnly: true },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ].filter(tab => !tab.adminOnly || isAdmin())

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary-200/30 via-transparent to-transparent dark:from-primary-900/20" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-secondary-200/30 via-transparent to-transparent dark:from-secondary-900/20" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/10 dark:bg-gray-800/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 rounded-full bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>

              <div className="flex items-center space-x-3">
                <CogIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Settings
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your account and organization
                  </p>
                </div>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <GlassCard>
              <div className="p-6">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <motion.button
                        key={tab.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                          ${activeTab === tab.id
                            ? 'bg-primary-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.name}</span>
                      </motion.button>
                    )
                  })}
                </nav>
              </div>
            </GlassCard>

            {/* Trial Status */}
            {trialStatus.isTrialActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <GlassCard>
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Trial Status
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {trialStatus.daysLeft} days remaining
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpgrade}
                      className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      Upgrade Now
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <GlassCard>
              <div className="p-8">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Profile Information
                    </h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Email cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {loading ? 'Updating...' : 'Update Profile'}
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Change Password
                    </h2>
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          required
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Billing & Subscription
                    </h2>

                    <div className="space-y-6">
                      {/* Current Plan */}
                      <div className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Current Plan
                        </h3>
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                          {organization?.plan || 'Starter'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Status: {organization?.subscriptionStatus || 'Trial'}
                        </p>
                      </div>

                      {/* Usage Stats */}
                      {billingInfo?.usage && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20 dark:border-white/10">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Analyses This Month</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {billingInfo.usage.analysesThisMonth || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20 dark:border-white/10">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Rows Processed</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {billingInfo.usage.rowsProcessed?.toLocaleString() || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-white/20 dark:border-white/10">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {organization?.memberCount || 1}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        {trialStatus.isTrialActive ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleUpgrade}
                            className="py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Upgrade to Pro
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleManageBilling}
                            className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Manage Billing
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Organization Tab */}
                {activeTab === 'organization' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Organization Settings
                    </h2>
                    <form onSubmit={handleOrgUpdate} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={orgForm.name}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                          placeholder="Organization name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Organization ID
                        </label>
                        <input
                          type="text"
                          value={organization?.id || ''}
                          disabled
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {loading ? 'Updating...' : 'Update Organization'}
                      </motion.button>
                    </form>
                  </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Notification Preferences
                    </h2>
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Notification settings will be available in a future update.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Security Settings
                    </h2>
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Advanced security features will be available in a future update.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  )
}