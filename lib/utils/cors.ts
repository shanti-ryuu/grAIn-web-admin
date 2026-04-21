import { NextRequest, NextResponse } from 'next/server'

/**
 * Add CORS headers to response for mobile/frontend apps
 */
export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  // List of allowed origins - configure based on your frontend deployments
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19001',
    // Add your deployed frontend URLs here
    process.env.NEXT_PUBLIC_ADMIN_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean)

  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  response.headers.set('Access-Control-Allow-Origin', corsOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Device-Id'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPrelight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
  return null
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
