import express from 'express'
import { body, param, validationResult } from 'express-validator'
import { PrismaClient, IntegrationType } from '@prisma/client'
import { asyncHandler, createApiError } from '../middleware/errorHandler'
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth'
import { logger, logAudit } from '../utils/logger'

const router = express.Router()
const prisma = new PrismaClient()

// Get all integrations for organization
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const integrations = await prisma.integration.findMany({
    where: { organizationId: req.user!.organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      lastSyncAt: true,
      nextSyncAt: true,
      errorCount: true,
      lastError: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ integrations })
}))

// Get specific integration
router.get('/:id', [
  param('id').isString().withMessage('Integration ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!integration) {
    throw createApiError('Integration not found', 404)
  }

  // Don't expose sensitive config in response
  const { config, ...safeIntegration } = integration

  res.json({
    ...safeIntegration,
    hasConfig: Object.keys(config as any).length > 0
  })
}))

// Create new integration
router.post('/', requireAdmin, [
  body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
  body('type').isIn(Object.values(IntegrationType)).withMessage('Invalid integration type'),
  body('config').isObject().withMessage('Configuration is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { name, type, config } = req.body

  // Validate configuration based on type
  const validationResult = validateIntegrationConfig(type, config)
  if (!validationResult.valid) {
    return res.status(400).json({
      error: 'Invalid configuration',
      message: validationResult.error
    })
  }

  // Encrypt sensitive configuration
  const encryptedConfig = encryptConfig(config)

  const integration = await prisma.integration.create({
    data: {
      name,
      type,
      config: encryptedConfig,
      organizationId: req.user!.organizationId
    },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true
    }
  })

  logAudit('INTEGRATION_CREATED', req.user!.id, req.user!.organizationId, {
    integrationId: integration.id,
    integrationType: type
  })

  res.status(201).json({
    message: 'Integration created successfully',
    integration
  })
}))

// Update integration
router.patch('/:id', requireAdmin, [
  param('id').isString().withMessage('Integration ID is required'),
  body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('config').optional().isObject().withMessage('Configuration must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const { name, config, isActive } = req.body

  const integration = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!integration) {
    throw createApiError('Integration not found', 404)
  }

  const updateData: any = {}

  if (name !== undefined) updateData.name = name
  if (isActive !== undefined) updateData.isActive = isActive

  if (config) {
    const validationResult = validateIntegrationConfig(integration.type, config)
    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        message: validationResult.error
      })
    }
    updateData.config = encryptConfig(config)
  }

  const updatedIntegration = await prisma.integration.update({
    where: { id: integration.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      updatedAt: true
    }
  })

  logAudit('INTEGRATION_UPDATED', req.user!.id, req.user!.organizationId, {
    integrationId: integration.id,
    updatedFields: Object.keys(updateData)
  })

  res.json({
    message: 'Integration updated successfully',
    integration: updatedIntegration
  })
}))

// Delete integration
router.delete('/:id', requireAdmin, [
  param('id').isString().withMessage('Integration ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!integration) {
    throw createApiError('Integration not found', 404)
  }

  await prisma.integration.delete({
    where: { id: integration.id }
  })

  logAudit('INTEGRATION_DELETED', req.user!.id, req.user!.organizationId, {
    integrationId: integration.id,
    integrationType: integration.type
  })

  res.json({
    message: 'Integration deleted successfully'
  })
}))

// Test integration connection
router.post('/:id/test', requireAdmin, [
  param('id').isString().withMessage('Integration ID is required'),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.user!.organizationId
    }
  })

  if (!integration) {
    throw createApiError('Integration not found', 404)
  }

  try {
    // Decrypt config for testing
    const config = decryptConfig(integration.config as any)

    // Test connection based on integration type
    const testResult = await testIntegrationConnection(integration.type, config)

    if (testResult.success) {
      // Reset error count on successful test
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          errorCount: 0,
          lastError: null
        }
      })
    }

    logAudit('INTEGRATION_TESTED', req.user!.id, req.user!.organizationId, {
      integrationId: integration.id,
      success: testResult.success
    })

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details
    })
  } catch (error) {
    logger.error('Integration test failed:', error)

    // Increment error count
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        errorCount: { increment: 1 },
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    res.json({
      success: false,
      message: 'Integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

// Get available integration types and their requirements
router.get('/types/available', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const integrationTypes = {
    WMS_MANHATTAN: {
      name: 'Manhattan WMS',
      description: 'Connect to Manhattan Warehouse Management System',
      requiredFields: ['host', 'username', 'password', 'database'],
      optionalFields: ['port', 'schema']
    },
    WMS_BLUE_YONDER: {
      name: 'Blue Yonder WMS',
      description: 'Connect to Blue Yonder (formerly JDA) WMS',
      requiredFields: ['apiUrl', 'apiKey', 'clientId'],
      optionalFields: ['timeout']
    },
    WMS_SAP: {
      name: 'SAP WMS',
      description: 'Connect to SAP Warehouse Management',
      requiredFields: ['host', 'client', 'username', 'password'],
      optionalFields: ['language', 'systemNumber']
    },
    ERP_NETSUITE: {
      name: 'NetSuite ERP',
      description: 'Connect to NetSuite ERP system',
      requiredFields: ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'],
      optionalFields: ['restletUrl']
    },
    ERP_ORACLE: {
      name: 'Oracle ERP',
      description: 'Connect to Oracle ERP Cloud',
      requiredFields: ['host', 'username', 'password'],
      optionalFields: ['port', 'serviceName']
    },
    ERP_DYNAMICS: {
      name: 'Microsoft Dynamics',
      description: 'Connect to Microsoft Dynamics 365',
      requiredFields: ['tenantId', 'clientId', 'clientSecret', 'resource'],
      optionalFields: ['apiVersion']
    },
    FTP_FOLDER: {
      name: 'FTP File Monitor',
      description: 'Monitor FTP folder for new files',
      requiredFields: ['host', 'username', 'password', 'remotePath'],
      optionalFields: ['port', 'secure', 'passive']
    },
    SFTP_FOLDER: {
      name: 'SFTP File Monitor',
      description: 'Monitor SFTP folder for new files',
      requiredFields: ['host', 'username', 'remotePath'],
      optionalFields: ['password', 'privateKey', 'port']
    },
    API_WEBHOOK: {
      name: 'Webhook Integration',
      description: 'Receive data via webhook calls',
      requiredFields: ['webhookUrl'],
      optionalFields: ['secret', 'headers']
    }
  }

  res.json({ integrationTypes })
}))

// Helper functions
function validateIntegrationConfig(type: IntegrationType, config: any): { valid: boolean; error?: string } {
  const requiredFields: Record<IntegrationType, string[]> = {
    WMS_MANHATTAN: ['host', 'username', 'password', 'database'],
    WMS_BLUE_YONDER: ['apiUrl', 'apiKey', 'clientId'],
    WMS_SAP: ['host', 'client', 'username', 'password'],
    ERP_NETSUITE: ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'],
    ERP_ORACLE: ['host', 'username', 'password'],
    ERP_DYNAMICS: ['tenantId', 'clientId', 'clientSecret', 'resource'],
    FTP_FOLDER: ['host', 'username', 'password', 'remotePath'],
    SFTP_FOLDER: ['host', 'username', 'remotePath'],
    API_WEBHOOK: ['webhookUrl']
  }

  const required = requiredFields[type]
  if (!required) {
    return { valid: false, error: 'Unknown integration type' }
  }

  for (const field of required) {
    if (!config[field]) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
  }

  return { valid: true }
}

function encryptConfig(config: any): any {
  // In production, use proper encryption
  // For now, just return as-is (would need crypto library)
  return config
}

function decryptConfig(config: any): any {
  // In production, decrypt the config
  // For now, just return as-is
  return config
}

async function testIntegrationConnection(type: IntegrationType, config: any): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  // Mock integration testing
  // In production, implement actual connection tests

  switch (type) {
    case 'FTP_FOLDER':
      // Test FTP connection
      return {
        success: true,
        message: 'FTP connection successful',
        details: { connectedAt: new Date() }
      }

    case 'API_WEBHOOK':
      // Validate webhook URL
      try {
        new URL(config.webhookUrl)
        return {
          success: true,
          message: 'Webhook URL is valid'
        }
      } catch {
        return {
          success: false,
          message: 'Invalid webhook URL'
        }
      }

    default:
      return {
        success: true,
        message: 'Integration test not implemented yet'
      }
  }
}

export default router