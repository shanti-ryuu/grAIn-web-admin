import { NextRequest, NextResponse } from 'next/server'

type CorsableResponse = NextResponse | Response

/**
 * Add CORS headers to response for mobile/frontend apps
 */
export function addCorsHeaders(response: CorsableResponse, origin?: string): NextResponse {
  const res = response instanceof NextResponse ? response : new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  // In development, allow all origins; in production, restrict to known origins
  if (process.env.NODE_ENV === 'development') {
    res.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'exp://localhost:8081',
      process.env.NEXT_PUBLIC_ADMIN_URL || '',
      process.env.NEXT_PUBLIC_APP_URL || '',
    ].filter(Boolean)

    // Check exact match or LAN pattern (192.168.x.x)
    const isLanOrigin = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin || '')
    const isAllowed = origin && (allowedOrigins.includes(origin) || isLanOrigin)

    const corsOrigin = isAllowed ? origin : allowedOrigins[0]
    res.headers.set('Access-Control-Allow-Origin', corsOrigin)
  }

  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Device-Id'
  )
  res.headers.set('Access-Control-Allow-Credentials', 'true')
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
