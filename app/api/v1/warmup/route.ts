import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://grain-ml-service.onrender.com'

// Render free tier cold-start guard:
// Set up cron-job.org or UptimeRobot to call these URLs every 4 minutes:
// 1. https://grain-web-admin.onrender.com/api/v1/ping
// 2. https://grain-web-admin.onrender.com/api/v1/warmup
// 3. https://grain-ml-service.onrender.com/health or /ping, whichever exists in the ML service.
// The mobile app also calls /warmup silently on launch before /auth/me.
export async function GET() {
  const startedAt = Date.now()
  const checks = {
    api: true,
    database: false,
    mlService: false,
  }

  try {
    await dbConnect()
    checks.database = true
  } catch (error) {
    console.warn('[Warmup] MongoDB warmup failed:', error instanceof Error ? error.message : error)
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    checks.mlService = response.ok
  } catch (error) {
    console.warn('[Warmup] ML service warmup failed:', error instanceof Error ? error.message : error)
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'warm',
        checks,
        responseTimeMs: Date.now() - startedAt,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
