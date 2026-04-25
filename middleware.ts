import { NextRequest, NextResponse } from 'next/server'

// FIX 1.1: Public endpoints that allow wildcard origin (ESP32, health checks)
const PUBLIC_ENDPOINTS = ['/api/health', '/api/sensors/data', '/api/commands/']

function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.some(ep => pathname.startsWith(ep))
}

function isAllowedOrigin(origin: string | null): boolean {
  // Native mobile apps (React Native / Expo) send no Origin header
  if (!origin) return true
  // Expo Go development client uses exp:// scheme
  if (origin.startsWith('exp://')) return true

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Development: allow localhost variants + LAN IPs
    const devAllowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
    ]
    if (devAllowed.includes(origin)) return true
    if (/^http:\/\/(127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.0\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) return true
    return false
  }

  // Production: allow Render URL + exp:// + null origin (already handled above)
  const prodAllowed = [
    'https://grain-web-admin.onrender.com',
    process.env.NEXT_PUBLIC_ADMIN_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean)
  if (prodAllowed.includes(origin)) return true
  if (origin.includes('.onrender.com')) return true
  // Allow LAN IPs for local testing even in production (mobile on same network)
  if (/^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.0\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) return true
  return false
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const pathname = request.nextUrl.pathname

  // --- Dashboard route protection (secondary defense) ---
  // Primary guard is client-side in dashboard/layout.tsx (token is in localStorage, not cookie).
  // Middleware adds a server-side layer: if a browser navigates directly to /dashboard/*
  // without an Authorization header, redirect to /auth/login before any HTML is served.
  if (pathname.startsWith('/dashboard')) {
    // Note: Browser page navigations don't send Authorization headers, so this
    // middleware cannot fully block unauthenticated access — the client-side guard
    // in layout.tsx handles that. This is a secondary defense for programmatic requests.
    // We let all dashboard requests through and rely on the client guard.
    return NextResponse.next()
  }

  // --- API route CORS handling ---
  // Handle CORS preflight (OPTIONS) first
  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    // Public endpoints: allow wildcard origin
    if (isPublicEndpoint(pathname)) {
      headers.set('Access-Control-Allow-Origin', '*')
    } else if (isAllowedOrigin(origin)) {
      headers.set('Access-Control-Allow-Origin', origin || '*')
      headers.set('Access-Control-Allow-Credentials', 'true')
    } else {
      // Still respond 200 to OPTIONS even if origin not allowed (prevent hanging)
      headers.set('Access-Control-Allow-Origin', 'null')
    }
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Device-Id')
    headers.set('Access-Control-Max-Age', '86400')
    return new NextResponse(null, { status: 200, headers })
  }

  const response = NextResponse.next()

  // Public endpoints: wildcard origin, no credentials
  if (isPublicEndpoint(pathname)) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Device-Id')
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}

export const config = { matcher: ['/api/:path*', '/dashboard/:path*'] }
