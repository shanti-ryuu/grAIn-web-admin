import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, string> = {}

  // Test 1: bcryptjs import
  try {
    const bcrypt = await import('bcryptjs')
    const hash = bcrypt.hashSync('test', 10)
    const match = bcrypt.compareSync('test', hash)
    results.bcryptjs = match ? 'ok' : 'compare failed'
  } catch (e: unknown) {
    results.bcryptjs = `ERROR: ${(e as Error).message}`
  }

  // Test 2: crypto import
  try {
    const crypto = await import('crypto')
    const token = crypto.randomBytes(16).toString('hex')
    results.crypto = token ? 'ok' : 'no output'
  } catch (e: unknown) {
    results.crypto = `ERROR: ${(e as Error).message}`
  }

  // Test 3: jsonwebtoken
  try {
    const jwt = await import('jsonwebtoken')
    const token = jwt.default.sign({ test: true }, 'secret', { expiresIn: '1m' })
    const decoded = jwt.default.verify(token, 'secret')
    results.jsonwebtoken = decoded ? 'ok' : 'verify failed'
  } catch (e: unknown) {
    results.jsonwebtoken = `ERROR: ${(e as Error).message}`
  }

  // Test 4: validator
  try {
    const validator = await import('validator')
    const escaped = validator.default.escape('<script>')
    results.validator = escaped ? 'ok' : 'no output'
  } catch (e: unknown) {
    results.validator = `ERROR: ${(e as Error).message}`
  }

  // Test 5: rate limit (in-memory fallback)
  try {
    const { checkRateLimit, RateLimits } = await import('@/lib/utils/rateLimit')
    const mockReq = { headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }), nextUrl: new URL('http://localhost/test') } as Parameters<typeof checkRateLimit>[0]
    const rl = await checkRateLimit(mockReq, RateLimits.AUTH)
    results.rateLimit = rl.allowed ? 'ok' : 'blocked'
  } catch (e: unknown) {
    results.rateLimit = `ERROR: ${(e as Error).message}`
  }

  // Test 6: User model query
  try {
    const dbConnect = (await import('@/lib/db')).default
    await dbConnect()
    const User = (await import('@/lib/models/User')).default
    const count = await User.countDocuments()
    results.userModel = `ok (${count} users)`
  } catch (e: unknown) {
    results.userModel = `ERROR: ${(e as Error).message}`
  }

  // Test 7: tokens utility
  try {
    const { generateAccessToken } = await import('@/lib/utils/tokens')
    const token = generateAccessToken({ userId: 'test', email: 'test@test.com', role: 'farmer' })
    results.tokens = token ? 'ok' : 'no token'
  } catch (e: unknown) {
    results.tokens = `ERROR: ${(e as Error).message}`
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}
