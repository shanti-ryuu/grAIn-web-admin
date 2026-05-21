import { NextResponse } from 'next/server'

// Lightweight health-check / keep-alive endpoint.
// No DB, no auth, no Firebase — sub-10ms response.
// Also used by UptimeRobot / cron to prevent Render cold starts.
// Recommended cron-job.org / UptimeRobot schedule: GET this URL every 4 minutes.
// Also keep the ML service warm every 4 minutes:
// https://grain-ml-service.onrender.com/health or /ping, depending on the deployed ML route.

export async function GET() {
  return new NextResponse('pong', {
    status: 200,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  })
}
