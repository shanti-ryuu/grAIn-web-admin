import { NextResponse } from 'next/server'
import { ErrorCodes } from '@/lib/enums'

// Re-export ErrorCodes for backward compatibility
export { ErrorCodes }

/**
 * Standardized API response format
 */
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  message?: string
  timestamp: string
}

/**
 * Success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
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
 * Error codes imported from enums — see lib/enums.ts for the complete list
 */
