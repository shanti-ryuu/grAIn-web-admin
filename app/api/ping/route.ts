import { NextResponse } from 'next/server'

// FIX 1.4: Keep-alive endpoint for Render free tier.
// Hit this endpoint every 10 minutes via cron job or UptimeRobot to prevent
// Render cold starts (service spins down after 15 min of inactivity).
// URL: https://grain-web-admin.onrender.com/api/ping

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function GET() {
  return NextResponse.json(
    { pong: true, timestamp: Date.now() },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
