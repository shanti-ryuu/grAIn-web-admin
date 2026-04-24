import { NextRequest, NextResponse } from 'next/server'

type CorsableResponse = NextResponse | Response

// FIX 1.1: Return allowed origins based on NODE_ENV
export function getAllowedOrigins(): string[] {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }

  return [
    'https://grain-web-admin.onrender.com',
    process.env.NEXT_PUBLIC_ADMIN_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean)
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true // Native mobile apps send no Origin header
  if (origin.startsWith('exp://')) return true // Expo Go development client

  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.includes(origin)) return true

  // LAN IP patterns for local testing
  if (/^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.0\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  if (origin.includes('.onrender.com')) return true

  return false
}

/**
 * Add CORS headers to response for mobile/frontend apps
 */
export function addCorsHeaders(response: CorsableResponse, origin?: string): NextResponse {
  const res = response instanceof NextResponse ? response : new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  if (isOriginAllowed(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin || '*')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Device-Id'
  )
  res.headers.set('Access-Control-Max-Age', '86400')

  return res
}

/**
 * Handle CORS preflight requests - returns NextResponse for OPTIONS, null otherwise
 */
export function handleCorsPrelight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
  return null
}

/**
 * Convenience: build an OPTIONS response with CORS headers
 */
export function corsOptionsResponse(request: NextRequest): NextResponse {
  return addCorsHeaders(new NextResponse(null, { status: 200 }), request.headers.get('origin') || undefined)
}

/**
 * Middleware to automatically add CORS headers to all responses
 */
export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Handle CORS preflight
    const corsPreflightResponse = handleCorsPrelight(req)
    if (corsPreflightResponse) {
      return corsPreflightResponse
    }

    // Get response from handler
    const response = await handler(req)

    // Add CORS headers
    return addCorsHeaders(response, req.headers.get('origin') || undefined)
  }
}
