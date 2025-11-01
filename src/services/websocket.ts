import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useWebSocket(url?: string) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Only connect if URL is provided and in browser
    if (typeof window === 'undefined' || !url) {
      return
    }

    // Create socket connection
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('WebSocket connected')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setConnected(false)
    })

    socket.on('message', (message: any) => {
      setMessages((prev) => [...prev, message])
    })

    return () => {
      socket.disconnect()
    }
  }, [url])

  const send = (event: string, data: any) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data)
    }
  }

  return {
    connected,
    messages,
    send,
    socket: socketRef.current
  }
}
