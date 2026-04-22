import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const state = mongoose.connection.readyState
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    const response = NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        database: states[state] ?? 'unknown',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  } catch (error: any) {
    const response = NextResponse.json({
      success: false,
      data: {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }, { status: 503 })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
