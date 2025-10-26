import express from 'express'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { logger, logAudit } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Stripe webhook handler
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']

  if (!sig) {
    logger.warn('Missing Stripe signature')
    return res.status(400).send('Missing signature')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  logger.info('Stripe webhook received', {
    type: event.type,
    id: event.id
  })

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    logger.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId

  if (!organizationId) {
    logger.warn('Subscription update without organization ID', { subscriptionId: subscription.id })
    return
  }

  const planId = subscription.metadata.planId as 'STARTER' | 'PROFESSIONAL'
  const status = mapStripeStatusToInternal(subscription.status)

  const planLimits = {
    STARTER: { maxUsers: 3, maxProducts: 100000 },
    PROFESSIONAL: { maxUsers: 10, maxProducts: 1000000 }
  }

  const limits = planLimits[planId] || planLimits.STARTER

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan: planId,
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      maxUsers: limits.maxUsers,
      maxProducts: limits.maxProducts,
      billingCycleAnchor: new Date(subscription.current_period_end * 1000)
    }
  })

  logAudit('SUBSCRIPTION_UPDATED_WEBHOOK', null, organizationId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    planId
  })

  logger.info('Subscription updated via webhook', {
    organizationId,
    subscriptionId: subscription.id,
    status: subscription.status
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId

  if (!organizationId) {
    logger.warn('Subscription deletion without organization ID', { subscriptionId: subscription.id })
    return
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null
    }
  })

  logAudit('SUBSCRIPTION_DELETED_WEBHOOK', null, organizationId, {
    subscriptionId: subscription.id
  })

  logger.info('Subscription deleted via webhook', {
    organizationId,
    subscriptionId: subscription.id
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    logger.warn('Payment succeeded for unknown customer', { customerId })
    return
  }

  // Update subscription status to active if it was past due
  if (organization.subscriptionStatus === 'PAST_DUE') {
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: 'ACTIVE'
      }
    })
  }

  logAudit('PAYMENT_SUCCEEDED_WEBHOOK', null, organization.id, {
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency
  })

  logger.info('Payment succeeded via webhook', {
    organizationId: organization.id,
    invoiceId: invoice.id,
    amount: invoice.amount_paid
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    logger.warn('Payment failed for unknown customer', { customerId })
    return
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: 'PAST_DUE'
    }
  })

  logAudit('PAYMENT_FAILED_WEBHOOK', null, organization.id, {
    invoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency
  })

  logger.info('Payment failed via webhook', {
    organizationId: organization.id,
    invoiceId: invoice.id,
    amount: invoice.amount_due
  })

  // TODO: Send notification to organization admins
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId

  if (!organizationId) {
    logger.warn('Trial ending without organization ID', { subscriptionId: subscription.id })
    return
  }

  logAudit('TRIAL_WILL_END_WEBHOOK', null, organizationId, {
    subscriptionId: subscription.id,
    trialEnd: new Date(subscription.trial_end! * 1000)
  })

  logger.info('Trial will end notification', {
    organizationId,
    subscriptionId: subscription.id,
    trialEnd: new Date(subscription.trial_end! * 1000)
  })

  // TODO: Send trial ending notification to organization admins
}

function mapStripeStatusToInternal(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
      return 'CANCELED'
    case 'trialing':
      return 'TRIAL'
    default:
      return 'UNPAID'
  }
}

export default router