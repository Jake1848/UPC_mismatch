import express from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth'
import { logger, logAudit } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

// Pricing plans configuration
const PRICING_PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_PRICE_ID_STARTER!,
    price: 599,
    maxUsers: 3,
    maxProducts: 100000,
    features: [
      'Up to 100K products',
      '3 team members',
      'Weekly monitoring',
      'Email alerts',
      'Basic API access'
    ]
  },
  PROFESSIONAL: {
    priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL!,
    price: 1299,
    maxUsers: 10,
    maxProducts: 1000000,
    features: [
      'Up to 1M products',
      '10 team members',
      'Daily monitoring',
      'All integrations',
      'Full API access',
      'Priority support'
    ]
  },
  ENTERPRISE: {
    priceId: 'contact',
    price: 'custom',
    maxUsers: 999999,
    maxProducts: 999999999,
    features: [
      'Unlimited products',
      'Unlimited team',
      'Real-time monitoring',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated support'
    ]
  }
}

// Get current subscription status
router.get('/subscription', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: {
      plan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      trialEndsAt: true,
      billingCycleAnchor: true,
      billingEmail: true
    }
  })

  if (!organization) {
    throw createApiError('Organization not found', 404)
  }

  let subscription = null
  let paymentMethod = null
  let invoices = []

  // Get Stripe subscription details if exists
  if (organization.stripeSubscriptionId) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(organization.stripeSubscriptionId, {
        expand: ['default_payment_method', 'customer']
      })

      subscription = {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null
      }

      if (stripeSubscription.default_payment_method) {
        const pm = stripeSubscription.default_payment_method as Stripe.PaymentMethod
        paymentMethod = {
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year
          } : null
        }
      }

      // Get recent invoices
      const stripeInvoices = await stripe.invoices.list({
        customer: organization.stripeCustomerId!,
        limit: 5
      })

      invoices = stripeInvoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        createdAt: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf
      }))
    } catch (error) {
      logger.error('Error fetching Stripe subscription:', error)
    }
  }

  const currentPlan = PRICING_PLANS[organization.plan as keyof typeof PRICING_PLANS]

  res.json({
    plan: organization.plan,
    subscriptionStatus: organization.subscriptionStatus,
    subscription,
    paymentMethod,
    invoices,
    currentPlan,
    availablePlans: PRICING_PLANS,
    trial: {
      isActive: organization.subscriptionStatus === 'TRIAL',
      endsAt: organization.trialEndsAt
    },
    billingEmail: organization.billingEmail
  })
}))

// Create checkout session for subscription
router.post('/checkout', requireAdmin, [
  body('planId').isIn(['STARTER', 'PROFESSIONAL']).withMessage('Invalid plan ID'),
  body('billingEmail').isEmail().withMessage('Valid billing email is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { planId, billingEmail } = req.body

  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId }
  })

  if (!organization) {
    throw createApiError('Organization not found', 404)
  }

  const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]

  if (!plan || plan.priceId === 'contact') {
    return res.status(400).json({
      error: 'Invalid plan',
      message: 'Selected plan is not available for self-service'
    })
  }

  try {
    let customerId = organization.stripeCustomerId

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billingEmail,
        name: organization.name,
        metadata: {
          organizationId: organization.id
        }
      })
      customerId = customer.id

      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          stripeCustomerId: customerId,
          billingEmail
        }
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing`,
      metadata: {
        organizationId: organization.id,
        planId
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          planId
        }
      }
    })

    logAudit('CHECKOUT_SESSION_CREATED', req.user!.id, req.user!.organizationId, {
      planId,
      sessionId: session.id
    })

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id
    })
  } catch (error) {
    logger.error('Stripe checkout error:', error)
    throw createApiError('Failed to create checkout session', 500)
  }
}))

// Handle successful checkout
router.post('/checkout/success', requireAdmin, [
  body('sessionId').isString().withMessage('Session ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { sessionId } = req.body

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    })

    if (session.metadata?.organizationId !== req.user!.organizationId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Session does not belong to your organization'
      })
    }

    const subscription = session.subscription as Stripe.Subscription
    const planId = session.metadata?.planId as keyof typeof PRICING_PLANS
    const plan = PRICING_PLANS[planId]

    // Update organization with subscription details
    await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: {
        plan: planId,
        subscriptionStatus: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        billingCycleAnchor: new Date(subscription.current_period_end * 1000)
      }
    })

    logAudit('SUBSCRIPTION_ACTIVATED', req.user!.id, req.user!.organizationId, {
      planId,
      subscriptionId: subscription.id
    })

    res.json({
      message: 'Subscription activated successfully',
      plan: planId,
      status: 'ACTIVE'
    })
  } catch (error) {
    logger.error('Checkout success handling error:', error)
    throw createApiError('Failed to process successful checkout', 500)
  }
}))

// Create customer portal session
router.post('/portal', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: { stripeCustomerId: true }
  })

  if (!organization?.stripeCustomerId) {
    return res.status(400).json({
      error: 'No billing account',
      message: 'Organization does not have a billing account set up'
    })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/billing`
    })

    logAudit('BILLING_PORTAL_ACCESSED', req.user!.id, req.user!.organizationId)

    res.json({
      portalUrl: session.url
    })
  } catch (error) {
    logger.error('Customer portal error:', error)
    throw createApiError('Failed to create portal session', 500)
  }
}))

// Cancel subscription
router.post('/cancel', requireAdmin, [
  body('reason').optional().isString().withMessage('Reason must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { reason } = req.body

  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: {
      stripeSubscriptionId: true,
      subscriptionStatus: true
    }
  })

  if (!organization?.stripeSubscriptionId) {
    return res.status(400).json({
      error: 'No active subscription',
      message: 'Organization does not have an active subscription'
    })
  }

  if (organization.subscriptionStatus === 'CANCELED') {
    return res.status(400).json({
      error: 'Already canceled',
      message: 'Subscription is already canceled'
    })
  }

  try {
    // Cancel at period end to allow access until billing cycle ends
    const subscription = await stripe.subscriptions.update(organization.stripeSubscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancelReason: reason || 'User requested cancellation'
      }
    })

    await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: {
        subscriptionStatus: 'CANCELED'
      }
    })

    logAudit('SUBSCRIPTION_CANCELED', req.user!.id, req.user!.organizationId, {
      reason,
      cancelAt: new Date(subscription.cancel_at! * 1000)
    })

    res.json({
      message: 'Subscription canceled successfully',
      cancelAt: new Date(subscription.cancel_at! * 1000)
    })
  } catch (error) {
    logger.error('Subscription cancellation error:', error)
    throw createApiError('Failed to cancel subscription', 500)
  }
}))

// Reactivate subscription
router.post('/reactivate', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId },
    select: {
      stripeSubscriptionId: true,
      subscriptionStatus: true
    }
  })

  if (!organization?.stripeSubscriptionId) {
    return res.status(400).json({
      error: 'No subscription found',
      message: 'Organization does not have a subscription'
    })
  }

  if (organization.subscriptionStatus !== 'CANCELED') {
    return res.status(400).json({
      error: 'Subscription not canceled',
      message: 'Only canceled subscriptions can be reactivated'
    })
  }

  try {
    const subscription = await stripe.subscriptions.update(organization.stripeSubscriptionId, {
      cancel_at_period_end: false
    })

    await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: {
        subscriptionStatus: 'ACTIVE'
      }
    })

    logAudit('SUBSCRIPTION_REACTIVATED', req.user!.id, req.user!.organizationId, {
      subscriptionId: subscription.id
    })

    res.json({
      message: 'Subscription reactivated successfully',
      status: 'ACTIVE'
    })
  } catch (error) {
    logger.error('Subscription reactivation error:', error)
    throw createApiError('Failed to reactivate subscription', 500)
  }
}))

export default router