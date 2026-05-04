import { NextRequest } from 'next/server'
import Prediction from '@/lib/models/Prediction'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { IPrediction } from '@/lib/models/Prediction'

export const GET = withAuth(async (request, user) => {
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

  return successResponse(formatted)
})
