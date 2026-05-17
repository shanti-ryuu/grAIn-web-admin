import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, ErrorCodes } from '@/lib/utils/response'

const MAX_BODY_SIZE = 10 * 1024 // 10 KB

type ValidationIssue = { path: Array<string | number>; message: string }

type SchemaLike<T> = {
  safeParse: (
    data: unknown
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: ValidationIssue[] } }
}


function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/\x00/g, '') // remove null bytes
    .replace(/<[^>]*>/g, '') // strip HTML tags
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : item && typeof item === 'object' && !Array.isArray(item)
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      )
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result as T
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: SchemaLike<T>,
  options: { requireJson?: boolean; maxBodySize?: number } = {}
): Promise<{ success: true; data: T; response?: never } | { success: false; data?: never; response: NextResponse }> {
  const { requireJson = true, maxBodySize = MAX_BODY_SIZE } = options

  // 1. Content-Type check
  if (requireJson) {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        response: errorResponse('Content-Type must be application/json', ErrorCodes.INVALID_INPUT, 415),
      }
    }
  }

  // 2. Body size guard — read via clone so the original stream is preserved for downstream use if needed
  let bodyText: string
  try {
    const cloned = request.clone()
    const bytes = await cloned.arrayBuffer()
    if (bytes.byteLength > maxBodySize) {
      return {
        success: false,
        response: errorResponse('Payload too large', ErrorCodes.INVALID_INPUT, 413),
      }
    }
    bodyText = new TextDecoder().decode(bytes)
  } catch {
    return {
      success: false,
      response: errorResponse('Invalid request body', ErrorCodes.INVALID_INPUT, 400),
    }
  }

  // 3. Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    if (requireJson) {
      return {
        success: false,
        response: errorResponse('Invalid JSON', ErrorCodes.INVALID_INPUT, 400),
      }
    }
    // For optional JSON bodies, try validating with undefined
    parsed = undefined
  }

  // 4. Sanitize strings
  if (parsed && typeof parsed === 'object') {
    parsed = sanitizeObject(parsed as Record<string, unknown>)
  }

  // 5. Zod validation — return generic message, log details server-side
  const result = schema.safeParse(parsed)
  if (!result.success) {
    console.warn(
      '[validateRequest] Validation failed:',
      result.error.issues
        .map((i: ValidationIssue) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
    )
    return {
      success: false,
      response: errorResponse('Invalid input', ErrorCodes.VALIDATION_ERROR, 400),
    }
  }

  return { success: true, data: result.data }
}
