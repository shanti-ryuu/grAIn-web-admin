'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type EventHandler = (data: Record<string, unknown>) => void

export function useEventStream() {
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)

    return () => {
      handlersRef.current.get(event)?.delete(handler)
    }
  }, [])

  const connect = useCallback(() => {
    if (eventSourceRef.current) return

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
    const es = new EventSource(`${baseUrl}/events`)
    eventSourceRef.current = es

    es.onopen = () => setIsConnected(true)

    es.onerror = () => {
      setIsConnected(false)
      es.close()
      eventSourceRef.current = null
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }

    es.addEventListener('connected', () => setIsConnected(true))
    es.addEventListener('sensor_update', (e) => {
      const data = JSON.parse(e.data)
      handlersRef.current.get('sensor_update')?.forEach(h => h(data))
    })
    es.addEventListener('session_update', (e) => {
      const data = JSON.parse(e.data)
      handlersRef.current.get('session_update')?.forEach(h => h(data))
    })
    es.addEventListener('session_complete', (e) => {
      const data = JSON.parse(e.data)
      handlersRef.current.get('session_complete')?.forEach(h => h(data))
    })
    es.addEventListener('alert', (e) => {
      const data = JSON.parse(e.data)
      handlersRef.current.get('alert')?.forEach(h => h(data))
    })
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { isConnected, subscribe, disconnect, connect }
}
