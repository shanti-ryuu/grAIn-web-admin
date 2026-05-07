import { NextResponse } from 'next/server'

// Lightweight health-check / keep-alive endpoint.
// No DB, no auth, no Firebase — sub-10ms response.
// Also used by UptimeRobot / cron to prevent Render cold starts.

export async function GET() {
  return new NextResponse('pong', {
    status: 200,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  })
}
