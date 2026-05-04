import { NextResponse } from 'next/server'

// Lightweight health-check / keep-alive endpoint.
// No DB, no auth, no Firebase — sub-10ms response.
// Also used by UptimeRobot / cron to prevent Render cold starts.

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
