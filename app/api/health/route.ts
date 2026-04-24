import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

// FIX 1.2: Health check responds instantly even if MongoDB hasn't connected yet.
// Render free tier marks service unhealthy if this endpoint is slow on cold start.
// Always returns HTTP 200 — DB state is reported in the body, never as an error code.
export async function GET(request: NextRequest) {
  const timestamp = Date.now()

  // Check MongoDB connectivity with a 1-second timeout
  let dbState: string = 'connecting'

  try {
    const dbCheck = connectDB().then(() => {
      const state = mongoose.connection.readyState
      const states: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      }
      return states[state] ?? 'unknown'
    })

    const timeout = new Promise<string>((resolve) => {
      setTimeout(() => resolve('slow'), 1000)
    })

    dbState = await Promise.race([dbCheck, timeout])
  } catch {
    dbState = 'disconnected'
  }

  const response = NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      db: dbState,
      environment: process.env.NODE_ENV,
      url: 'https://grain-web-admin.onrender.com',
      cors: 'enabled',
      timestamp,
      version: '1.0.0',
    },
  })

  // Add CORS headers directly as fallback (middleware may not run on cold start)
  return addCorsHeaders(response, request.headers.get('origin') || undefined)
}
