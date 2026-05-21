import { NextResponse } from 'next/server'

/**
 * Standardized API response format
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  message?: string
  warning?: string
  timestamp: string
}

/**
 * Success response
 */
export function successResponse<T>(data: T, statusOrOptions: number | { status?: number; warning?: string } = 200): NextResponse<ApiResponse<T>> {
  const options = typeof statusOrOptions === 'number'
    ? { status: statusOrOptions, warning: undefined }
    : statusOrOptions
  const body: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
  if (options.warning) body.warning = options.warning
  return NextResponse.json(body, { status: options.status ?? 200 })
}

/**
 * Error response with standardized format
 */
export function errorResponse(
  message: string,
  errorCode: string = 'INTERNAL_ERROR',
  status: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    count: number
    page: number
    limit: number
    totalPages: number
  }
  timestamp: string
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  status: number = 200
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        total,
        count: data.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Multi-Status response (207) — partial success.
 * Used when MongoDB write succeeded but Firebase realtime push failed.
 */
export function multiStatusResponse<T>(
  data: T,
  warning: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      warning,
      timestamp: new Date().toISOString(),
    },
    { status: 207 }
  )
}

/**
 * Error codes — single source of truth is lib/enums.ts.
 * Re-exported here for backward compatibility with existing imports.
 */
export { ErrorCodes } from '@/lib/enums'
