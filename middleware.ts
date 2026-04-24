import { NextRequest, NextResponse } from 'next/server'

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true
  const allowed = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'https://grain-web-admin.onrender.com',
  ]
  if (allowed.includes(origin)) return true
  if (origin.includes('192.168.')) return true
  if (origin.includes('10.0.')) return true
  if (origin.includes('172.16.')) return true
  if (origin.startsWith('exp://')) return true
  if (origin.includes('.onrender.com')) return true
  return false
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers',
      'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }
  return response
}

export const config = { matcher: '/api/:path*' }
