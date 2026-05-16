import SensorData from '@/lib/models/SensorData'
import Prediction from '@/lib/models/Prediction'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { AlertType } from '@/lib/enums'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://grain-ml-service.onrender.com'

interface MLPrediction {
  predictedMoisture30min: number
  estimatedMinutesToTarget: number
  recommendation: string
  recommendationType: string
  action: string
  efficiencyScore: number
  confidence: number
  isDryingComplete: boolean
  targetMoisture: number
  algorithm: string
  projectedCurve: Array<{ minutesFromNow: number; predictedMoisture: number }>
  modelMetrics?: { moistureR2: number; timeR2: number }
}

let mlServiceAvailable = true
let lastFailureTime = 0
const COOLDOWN_MS = 15000

async function callMLService(payload: Record<string, unknown>): Promise<MLPrediction | null> {
  const now = Date.now()

  // If ML service failed recently, skip it entirely (no timeout spam)
  if (!mlServiceAvailable && now - lastFailureTime < COOLDOWN_MS) {
    return null
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      mlServiceAvailable = false
      lastFailureTime = now
      console.warn(`[ML] Service returned ${response.status}, cooling down 15s`)
      return null
    }

    mlServiceAvailable = true
    return await response.json() as MLPrediction
  } catch {
    if (mlServiceAvailable) {
      console.warn('[ML] Service unavailable, cooling down 15s')
    }
    mlServiceAvailable = false
    lastFailureTime = now
    return null
  }
}

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

    const moistures = recentReadings.map((r: { moisture?: number }) => r.moisture ?? 0)
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

async function getRecentDryingRate(deviceId: string): Promise<number> {
  try {
    const readings = await SensorData.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(6)
      .select('moisture timestamp')

    if (readings.length < 2) return 0.01

    const first = readings[readings.length - 1]
    const last = readings[0]
    const moistureDrop = (first.moisture ?? 0) - (last.moisture ?? 0)
    const timeDiffMin = (new Date(last.timestamp ?? Date.now()).getTime() - new Date(first.timestamp ?? Date.now()).getTime()) / 60000

    if (timeDiffMin <= 0) return 0.01
    return Math.max(0.001, moistureDrop / timeDiffMin)
  } catch {
    return 0.01
  }
}

export const POST = withAuth(async (request, user) => {
  void user
  const body = await request.json()
  const { deviceId, temperature, humidity, moisture, fanSpeed, timeElapsed, solarVoltage } = body

  if (!deviceId || temperature == null || humidity == null || moisture == null || fanSpeed == null || timeElapsed == null) {
    return errorResponse('Missing required fields: deviceId, temperature, humidity, moisture, fanSpeed, timeElapsed', ErrorCodes.INVALID_INPUT, 400)
  }

  const dryingRate = await getRecentDryingRate(deviceId)

  // Try ML service first
  const mlResult = await callMLService({
    deviceId,
    temperature,
    humidity,
    moisture,
    fanSpeed,
    timeElapsed,
    solarVoltage: solarVoltage ?? 12.0,
    energyConsumed: body.energyConsumed ?? 0,
    dryingRate,
  })

  let prediction

  if (mlResult) {
    // ML service responded — use its predictions
    const projectedCurve = mlResult.projectedCurve.map(p => ({
      time: p.minutesFromNow,
      moisture: p.predictedMoisture,
    }))

    prediction = {
      predictedMoisture30min: mlResult.predictedMoisture30min,
      estimatedMinutesToTarget: mlResult.estimatedMinutesToTarget,
      recommendation: mlResult.recommendation,
      recommendationType: mlResult.recommendationType,
      action: mlResult.action ?? 'MAINTAIN',
      efficiencyScore: mlResult.efficiencyScore,
      confidence: mlResult.confidence <= 1 ? Math.round(mlResult.confidence * 100) : mlResult.confidence,
      isDryingComplete: mlResult.isDryingComplete,
      projectedCurve,
      targetMoisture: 14,
      algorithm: mlResult.algorithm,
      modelMetrics: mlResult.modelMetrics,
    }
  } else {
    // Fallback: rule-based prediction
    const ruleRate = calculateDryingRate(temperature, fanSpeed)
    const predictedMoisture30min = Math.max(0, moisture - ruleRate * 30)
    const estimatedMinutesToTarget = moisture <= 14 ? 0 : Math.max(0, Math.ceil((moisture - 14) / ruleRate))
    const { recommendation, type: recommendationType } = getRecommendation(temperature, fanSpeed, humidity, moisture)
    const efficiencyScore = calculateEfficiency(temperature, fanSpeed, humidity)
    const confidence = await calculateConfidence(deviceId)
    const isDryingComplete = moisture <= 14

    const projectedCurve = []
    for (let i = 1; i <= 13; i++) {
      const projectedMoisture = Math.max(0, moisture - ruleRate * 30 * i)
      projectedCurve.push({ time: i * 30, moisture: Math.round(projectedMoisture * 100) / 100 })
      if (projectedMoisture <= 14) break
    }

    prediction = {
      predictedMoisture30min: Math.round(predictedMoisture30min * 100) / 100,
      estimatedMinutesToTarget,
      recommendation,
      recommendationType,
      efficiencyScore,
      confidence,
      isDryingComplete,
      projectedCurve,
      targetMoisture: 14,
      algorithm: 'rule-based-v1-fallback',
    }
  }

  await Prediction.create({
    deviceId,
    input: { temperature, humidity, moisture, fanSpeed, timeElapsed, solarVoltage },
    output: {
      ...prediction,
      targetMoisture: 14,
    },
    isDryingComplete: prediction.isDryingComplete,
  })

  return successResponse(prediction)
})
