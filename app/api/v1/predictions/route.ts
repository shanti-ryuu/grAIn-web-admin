import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Prediction from '@/lib/models/Prediction'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { IPrediction } from '@/lib/models/Prediction'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

    const query: Record<string, string> = deviceId ? { deviceId } : {}
    const predictions = await Prediction
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const formatted = predictions.map((p: IPrediction) => ({
      id: p._id,
      deviceId: p.deviceId,
      input: p.input,
      output: p.output,
      isDryingComplete: p.isDryingComplete,
      createdAt: p.createdAt.toISOString(),
    }))

    const response = successResponse(formatted)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Get predictions error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
