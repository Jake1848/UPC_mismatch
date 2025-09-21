import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface AuthenticatedSocket extends Socket {
  userId?: string
  organizationId?: string
  userRole?: string
}

export function setupWebSocket(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication token required'))
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error('JWT_SECRET not configured'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: string
        email: string
        organizationId: string
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
          isActive: true
        },
        select: {
          id: true,
          role: true,
          organizationId: true
        }
      })

      if (!user) {
        return next(new Error('User not found or inactive'))
      }

      socket.userId = user.id
      socket.organizationId = user.organizationId
      socket.userRole = user.role

      next()
    } catch (error) {
      logger.error('WebSocket authentication failed:', error)
      next(new Error('Invalid authentication token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.userId,
      organizationId: socket.organizationId
    })

    // Join organization-specific room
    if (socket.organizationId) {
      socket.join(`org:${socket.organizationId}`)
    }

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
    }

    // Handle analysis progress subscription
    socket.on('subscribe:analysis', (analysisId: string) => {
      if (!analysisId) return

      // Verify user has access to this analysis
      prisma.analysis.findFirst({
        where: {
          id: analysisId,
          organizationId: socket.organizationId
        }
      }).then(analysis => {
        if (analysis) {
          socket.join(`analysis:${analysisId}`)
          logger.debug('User subscribed to analysis updates', {
            userId: socket.userId,
            analysisId
          })
        }
      }).catch(error => {
        logger.error('Error verifying analysis access:', error)
      })
    })

    // Handle analysis progress unsubscription
    socket.on('unsubscribe:analysis', (analysisId: string) => {
      if (!analysisId) return
      socket.leave(`analysis:${analysisId}`)
      logger.debug('User unsubscribed from analysis updates', {
        userId: socket.userId,
        analysisId
      })
    })

    // Handle conflict updates subscription
    socket.on('subscribe:conflicts', () => {
      if (socket.organizationId) {
        socket.join(`conflicts:${socket.organizationId}`)
        logger.debug('User subscribed to conflict updates', {
          userId: socket.userId,
          organizationId: socket.organizationId
        })
      }
    })

    // Handle conflict updates unsubscription
    socket.on('unsubscribe:conflicts', () => {
      if (socket.organizationId) {
        socket.leave(`conflicts:${socket.organizationId}`)
        logger.debug('User unsubscribed from conflict updates', {
          userId: socket.userId,
          organizationId: socket.organizationId
        })
      }
    })

    // Handle team notifications subscription
    socket.on('subscribe:team', () => {
      if (socket.organizationId) {
        socket.join(`team:${socket.organizationId}`)
        logger.debug('User subscribed to team notifications', {
          userId: socket.userId,
          organizationId: socket.organizationId
        })
      }
    })

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      })
    })

    // Send initial connection success
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.userId,
      organizationId: socket.organizationId,
      timestamp: Date.now()
    })
  })

  logger.info('WebSocket server initialized')
}

// Helper functions to send notifications
export class WebSocketNotifier {
  constructor(private io: SocketIOServer) {}

  // Send analysis progress update
  sendAnalysisProgress(analysisId: string, progress: {
    status: string
    progress: number
    message?: string
    error?: string
  }) {
    this.io.to(`analysis:${analysisId}`).emit('analysis:progress', {
      analysisId,
      ...progress,
      timestamp: Date.now()
    })

    logger.debug('Sent analysis progress update', {
      analysisId,
      status: progress.status,
      progress: progress.progress
    })
  }

  // Send analysis completion notification
  sendAnalysisComplete(analysisId: string, organizationId: string, results: {
    totalRecords: number
    duplicateUPCs: number
    multiUPCProducts: number
    maxDuplication: number
  }) {
    const notification = {
      type: 'analysis_complete',
      analysisId,
      results,
      timestamp: Date.now()
    }

    this.io.to(`analysis:${analysisId}`).emit('analysis:complete', notification)
    this.io.to(`org:${organizationId}`).emit('notification', notification)

    logger.info('Sent analysis completion notification', {
      analysisId,
      organizationId,
      results
    })
  }

  // Send new conflict notification
  sendNewConflict(organizationId: string, conflict: {
    id: string
    type: string
    severity: string
    upc?: string
    productId?: string
    description: string
  }) {
    const notification = {
      type: 'new_conflict',
      conflict,
      timestamp: Date.now()
    }

    this.io.to(`conflicts:${organizationId}`).emit('conflict:new', notification)
    this.io.to(`org:${organizationId}`).emit('notification', notification)

    logger.info('Sent new conflict notification', {
      organizationId,
      conflictId: conflict.id,
      severity: conflict.severity
    })
  }

  // Send conflict assignment notification
  sendConflictAssigned(userId: string, organizationId: string, conflict: {
    id: string
    type: string
    severity: string
    description: string
    assignedBy: string
  }) {
    const notification = {
      type: 'conflict_assigned',
      conflict,
      timestamp: Date.now()
    }

    this.io.to(`user:${userId}`).emit('conflict:assigned', notification)
    this.io.to(`team:${organizationId}`).emit('team:notification', notification)

    logger.info('Sent conflict assignment notification', {
      userId,
      organizationId,
      conflictId: conflict.id
    })
  }

  // Send conflict resolution notification
  sendConflictResolved(organizationId: string, conflict: {
    id: string
    type: string
    severity: string
    resolvedBy: string
    resolutionNotes?: string
  }) {
    const notification = {
      type: 'conflict_resolved',
      conflict,
      timestamp: Date.now()
    }

    this.io.to(`conflicts:${organizationId}`).emit('conflict:resolved', notification)
    this.io.to(`team:${organizationId}`).emit('team:notification', notification)

    logger.info('Sent conflict resolution notification', {
      organizationId,
      conflictId: conflict.id,
      resolvedBy: conflict.resolvedBy
    })
  }

  // Send system notification to organization
  sendSystemNotification(organizationId: string, notification: {
    type: string
    title: string
    message: string
    severity: 'info' | 'warning' | 'error'
    actionUrl?: string
  }) {
    const message = {
      ...notification,
      timestamp: Date.now()
    }

    this.io.to(`org:${organizationId}`).emit('system:notification', message)

    logger.info('Sent system notification', {
      organizationId,
      type: notification.type,
      severity: notification.severity
    })
  }

  // Send trial expiration warning
  sendTrialExpiring(organizationId: string, daysLeft: number) {
    const notification = {
      type: 'trial_expiring',
      title: 'Trial Expiring Soon',
      message: `Your trial expires in ${daysLeft} days. Please upgrade to continue using the service.`,
      severity: 'warning' as const,
      daysLeft,
      actionUrl: '/billing',
      timestamp: Date.now()
    }

    this.io.to(`org:${organizationId}`).emit('system:notification', notification)

    logger.info('Sent trial expiration warning', {
      organizationId,
      daysLeft
    })
  }

  // Send subscription status update
  sendSubscriptionUpdate(organizationId: string, update: {
    status: string
    plan?: string
    message: string
  }) {
    const notification = {
      type: 'subscription_update',
      ...update,
      timestamp: Date.now()
    }

    this.io.to(`org:${organizationId}`).emit('subscription:update', notification)

    logger.info('Sent subscription update notification', {
      organizationId,
      status: update.status
    })
  }

  // Send user activity notification (login, role change, etc.)
  sendUserActivity(organizationId: string, activity: {
    type: string
    userId: string
    userName: string
    action: string
    details?: any
  }) {
    const notification = {
      type: 'user_activity',
      ...activity,
      timestamp: Date.now()
    }

    this.io.to(`team:${organizationId}`).emit('team:activity', notification)

    logger.debug('Sent user activity notification', {
      organizationId,
      userId: activity.userId,
      action: activity.action
    })
  }

  // Broadcast to all connected users in organization
  broadcastToOrganization(organizationId: string, event: string, data: any) {
    this.io.to(`org:${organizationId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    })

    logger.debug('Broadcasted message to organization', {
      organizationId,
      event
    })
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    })

    logger.debug('Sent message to user', {
      userId,
      event
    })
  }

  // Get connection stats
  getConnectionStats() {
    const sockets = this.io.sockets.sockets
    const connections = Array.from(sockets.values()) as AuthenticatedSocket[]

    const stats = {
      totalConnections: connections.length,
      organizations: new Set(connections.map(s => s.organizationId).filter(Boolean)).size,
      users: new Set(connections.map(s => s.userId).filter(Boolean)).size,
      rooms: Object.keys(this.io.sockets.adapter.rooms)
    }

    return stats
  }
}

// Export singleton instance
let notifierInstance: WebSocketNotifier | null = null

export function getNotifier(): WebSocketNotifier | null {
  return notifierInstance
}

export function setNotifier(io: SocketIOServer): void {
  notifierInstance = new WebSocketNotifier(io)
}