import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin') || ''

  // Handle CORS preflight (OPTIONS) requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })

    if (process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', origin || '*')
    } else {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXT_PUBLIC_ADMIN_URL || '',
        process.env.NEXT_PUBLIC_APP_URL || '',
      ].filter(Boolean)

      if (allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      } else {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0])
      }
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Device-Id')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }

  // For actual requests, continue and add CORS headers to the response
  const response = NextResponse.next()

  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXT_PUBLIC_ADMIN_URL || '',
      process.env.NEXT_PUBLIC_APP_URL || '',
    ].filter(Boolean)

    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Device-Id')
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
}

export const config = {
  matcher: '/api/:path*',
}
