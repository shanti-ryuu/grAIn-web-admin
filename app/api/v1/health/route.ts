import dbConnect from '@/lib/db'
import { successResponse } from '@/lib/utils/response'

export async function GET() {
  const start = Date.now()
  let dbStatus = 'disconnected'

  try {
    const mongoose = await dbConnect()
    dbStatus = mongoose?.connection?.readyState === 1 ? 'connected' : 'disconnected'
  } catch {
    dbStatus = 'error'
  }

  const response = successResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    responseTime: `${Date.now() - start}ms`,
  })

  response.headers.set('Cache-Control', 'no-store')
  return response
}
