import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const response = NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
    })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  } catch (error) {
    console.error('Health check failed:', error)
    const response = NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
