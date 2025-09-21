import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { NotificationMessage } from '../types'

class WebSocketService {
  private socket: Socket | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map()

  connect(token: string) {
    if (this.socket?.connected) {
      return
    }

    this.token = token

    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: {
        token,
      },
      transports: ['websocket'],
      upgrade: false,
    })

    this.setupEventListeners()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  private setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('connected', { connected: true })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.emit('disconnected', { connected: false, reason })

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.attemptReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.emit('error', { error: error.message })
      this.attemptReconnect()
    })

    // Analysis events
    this.socket.on('analysis:progress', (data) => {
      this.emit('analysis:progress', data)
    })

    this.socket.on('analysis:complete', (data) => {
      this.emit('analysis:complete', data)
      toast.success('Analysis completed successfully!')
    })

    // Conflict events
    this.socket.on('conflict:new', (data) => {
      this.emit('conflict:new', data)

      if (data.conflict.severity === 'CRITICAL' || data.conflict.severity === 'HIGH') {
        toast.error(`New ${data.conflict.severity.toLowerCase()} conflict detected!`)
      }
    })

    this.socket.on('conflict:assigned', (data) => {
      this.emit('conflict:assigned', data)
      toast.info('You have been assigned a new conflict')
    })

    this.socket.on('conflict:resolved', (data) => {
      this.emit('conflict:resolved', data)
      toast.success('Conflict has been resolved')
    })

    // Team events
    this.socket.on('team:notification', (data) => {
      this.emit('team:notification', data)
    })

    this.socket.on('team:activity', (data) => {
      this.emit('team:activity', data)
    })

    // System events
    this.socket.on('system:notification', (data) => {
      this.emit('system:notification', data)

      if (data.severity === 'error') {
        toast.error(data.message)
      } else if (data.severity === 'warning') {
        toast.error(data.message, { duration: 6000 })
      } else {
        toast(data.message)
      }
    })

    this.socket.on('subscription:update', (data) => {
      this.emit('subscription:update', data)
      toast.success(data.message)
    })

    // Generic notification handler
    this.socket.on('notification', (data: NotificationMessage) => {
      this.emit('notification', data)

      // Show toast based on type
      switch (data.type) {
        case 'analysis_complete':
          toast.success('Analysis completed!')
          break
        case 'trial_expiring':
          toast.error(data.message, { duration: 10000 })
          break
        default:
          if (data.severity) {
            switch (data.severity) {
              case 'error':
                toast.error(data.message)
                break
              case 'warning':
                toast.error(data.message, { duration: 6000 })
                break
              case 'success':
                toast.success(data.message)
                break
              default:
                toast(data.message)
            }
          }
      }
    })

    // Ping/pong for connection health
    this.socket.on('pong', (data) => {
      this.emit('pong', data)
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      toast.error('Connection lost. Please refresh the page.')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      if (this.token) {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect(this.token)
      }
    }, delay)
  }

  // Subscription methods
  subscribeToAnalysis(analysisId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:analysis', analysisId)
    }
  }

  unsubscribeFromAnalysis(analysisId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:analysis', analysisId)
    }
  }

  subscribeToConflicts() {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:conflicts')
    }
  }

  unsubscribeFromConflicts() {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:conflicts')
    }
  }

  subscribeToTeam() {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:team')
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in WebSocket event callback:', error)
        }
      })
    }
  }

  // Utility methods
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping')
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }

  getConnectionId() {
    return this.socket?.id
  }
}

// Create singleton instance
const webSocketService = new WebSocketService()

// React hooks for WebSocket functionality
export const useWebSocket = () => {
  const connect = (token: string) => webSocketService.connect(token)
  const disconnect = () => webSocketService.disconnect()
  const isConnected = () => webSocketService.isConnected()

  return {
    connect,
    disconnect,
    isConnected,
    subscribeToAnalysis: webSocketService.subscribeToAnalysis.bind(webSocketService),
    unsubscribeFromAnalysis: webSocketService.unsubscribeFromAnalysis.bind(webSocketService),
    subscribeToConflicts: webSocketService.subscribeToConflicts.bind(webSocketService),
    unsubscribeFromConflicts: webSocketService.unsubscribeFromConflicts.bind(webSocketService),
    subscribeToTeam: webSocketService.subscribeToTeam.bind(webSocketService),
    on: webSocketService.on.bind(webSocketService),
    off: webSocketService.off.bind(webSocketService),
    ping: webSocketService.ping.bind(webSocketService),
  }
}

export default webSocketService