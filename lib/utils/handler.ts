import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { getUserFromRequest, TokenPayload } from '@/lib/utils/auth'
import { errorResponse } from '@/lib/utils/response'
import { ErrorCodes, UserRole } from '@/lib/enums'

type RoleCheck = UserRole.Admin | 'any' | ((user: TokenPayload) => boolean)

interface HandlerOptions {
  /** Role requirement: 'admin' = admin-only, 'any' = any authenticated user, or a custom predicate */
  role?: RoleCheck
  /** Whether to connect to MongoDB before running the handler (default: true) */
  dbConnect?: boolean
}

type AuthenticatedHandler = (
  request: NextRequest,
  user: TokenPayload,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

/**
 * Higher-order wrapper for authenticated API routes.
 * Handles: dbConnect, getUserFromRequest, role check, try/catch, errorResponse.
 * CORS is handled globally by middleware.ts — no per-route CORS needed.
 *
 * @example
 * export const GET = withAuth(async (req, user) => {
 *   const devices = await Device.find({})
 *   return successResponse(devices)
 * })
 *
 * @example
 * export const POST = withAuth(
 *   async (req, user) => { ... },
 *   { role: UserRole.Admin }
 * )
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: HandlerOptions = {}
): (request: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  const { role = 'any', dbConnect: shouldConnect = true } = options

  return async (request: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      // 1. Connect to MongoDB
      if (shouldConnect) await dbConnect()

      // 2. Verify JWT + revoked token check
      const user = await getUserFromRequest(request)
      if (!user) {
        return errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      }

      // 3. Role check
      if (role === UserRole.Admin && user.role !== UserRole.Admin) {
        return errorResponse('Forbidden: Admin access required', ErrorCodes.FORBIDDEN, 403)
      } else if (typeof role === 'function' && !role(user)) {
        return errorResponse('Forbidden', ErrorCodes.FORBIDDEN, 403)
      }

      // 4. Run the handler
      return await handler(request, user, { params: ctx.params })

    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code
      if (code === 'ECONNRESET' || code === 'EPIPE' || (error as Error)?.message === 'aborted') {
        return NextResponse.json(null, { status: 499 })
      }
      console.error('[withAuth] Unhandled error:', error)
      return errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    }
  }
}
