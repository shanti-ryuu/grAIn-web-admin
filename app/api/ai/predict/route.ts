import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Prediction from '@/lib/models/Prediction'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { AlertType } from '@/lib/enums'

function calculateDryingRate(temp: number, fanSpeed: number): number {
  const baseRate = 0.008
  const tempFactor = Math.max(0, (temp - 30) / 40)
  const fanFactor = fanSpeed / 100
  return baseRate * (1 + tempFactor * 0.6) * (0.4 + fanFactor * 0.6)
}

function getRecommendation(temp: number, fanSpeed: number, humidity: number, moisture: number): { recommendation: string; type: string } {
  if (temp > 65) return { recommendation: 'Temperature too high — grain cracking risk', type: AlertType.Critical }
  if (temp < 35) return { recommendation: 'Temperature too low — increase heating', type: AlertType.Warning }
  if (fanSpeed < 50) return { recommendation: 'Increase fan speed for better airflow', type: AlertType.Warning }
  if (humidity > 70) return { recommendation: 'High humidity — increase exhaust fan', type: AlertType.Warning }
  if (moisture <= 14) return { recommendation: 'Drying complete — stop dryer now', type: 'optimal' }
  return { recommendation: 'Optimal conditions — maintain settings', type: 'optimal' }
}

function calculateEfficiency(temp: number, fanSpeed: number, humidity: number): number {
  let score = 100
  if (temp < 35 || temp > 65) score -= 25
  if (fanSpeed < 50) score -= 15
  if (humidity > 70) score -= 10
  return Math.max(0, Math.min(100, score))
}

async function calculateConfidence(deviceId: string): Promise<number> {
  try {
    const recentReadings = await SensorData.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(5)
      .select('moisture')

    if (recentReadings.length < 2) return 65

    const moistures = recentReadings.map((r: any) => r.moisture)
    const mean = moistures.reduce((a: number, b: number) => a + b, 0) / moistures.length
    const variance = moistures.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / moistures.length

    if (variance < 1) return 95
    if (variance < 3) return 85
    if (variance < 5) return 75
    return 65
  } catch {
    return 65
  }
}

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const body = await request.json()
    const { deviceId, temperature, humidity, moisture, fanSpeed, timeElapsed, solarVoltage } = body

    if (!deviceId || temperature == null || humidity == null || moisture == null || fanSpeed == null || timeElapsed == null) {
      const response = errorResponse('Missing required fields: deviceId, temperature, humidity, moisture, fanSpeed, timeElapsed', ErrorCodes.INVALID_INPUT, 400)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const dryingRate = calculateDryingRate(temperature, fanSpeed)
    const predictedMoisture30min = Math.max(0, moisture - dryingRate * 30)
    const estimatedMinutesToTarget = moisture <= 14 ? 0 : Math.max(0, Math.ceil((moisture - 14) / dryingRate))
    const { recommendation, type: recommendationType } = getRecommendation(temperature, fanSpeed, humidity, moisture)
    const efficiencyScore = calculateEfficiency(temperature, fanSpeed, humidity)
    const confidence = await calculateConfidence(deviceId)
    const isDryingComplete = moisture <= 14

    const projectedCurve = []
    for (let i = 1; i <= 13; i++) {
      const projectedMoisture = Math.max(0, moisture - dryingRate * 30 * i)
      projectedCurve.push({ time: i * 30, moisture: Math.round(projectedMoisture * 100) / 100 })
      if (projectedMoisture <= 14) break
    }

    await Prediction.create({
      deviceId,
      input: { temperature, humidity, moisture, fanSpeed, timeElapsed, solarVoltage },
      output: {
        predictedMoisture30min: Math.round(predictedMoisture30min * 100) / 100,
        estimatedMinutesToTarget,
        recommendation,
        recommendationType,
        efficiencyScore,
        confidence,
        isDryingComplete,
        projectedCurve,
        targetMoisture: 14,
        algorithm: 'rule-based-v1',
      },
      isDryingComplete,
    })

    const responseData = {
      predictedMoisture30min: Math.round(predictedMoisture30min * 100) / 100,
      estimatedMinutesToTarget,
      recommendation,
      recommendationType,
      efficiencyScore,
      confidence,
      isDryingComplete,
      projectedCurve,
      targetMoisture: 14,
      algorithm: 'rule-based-v1',
      note: 'Phase 1 model — will be upgraded to Random Forest Regressor after 20-30 experimental drying cycles',
    }

    const response = successResponse(responseData)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error: any) {
    console.error('AI prediction error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
