import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/handler'
import { eventBroadcaster } from '@/lib/utils/event-stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAuth(async (request) => {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), connections: eventBroadcaster.connectionCount + 1 })}\n\n`))

      const unsubscribe = eventBroadcaster.subscribe((data: string) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          unsubscribe()
        }
      })

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeat)
          unsubscribe()
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}, { dbConnect: false })
