import * as dotenv from 'dotenv'
import { resolve } from 'path'
import mongoose from 'mongoose'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import dbConnect from '../lib/db'
import Device from '../lib/models/Device'
import DryingSession from '../lib/models/DryingSession'
import SensorData from '../lib/models/SensorData'
import User from '../lib/models/User'

const DEVICE_ID = 'GR-001'
const SIMULATION_TAG = 'historical-rice-drying-demo-v1'
const SESSION_DAYS = [1, 3, 4, 5] as const // Monday, Wednesday, Thursday, Friday
const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
}

type SessionPlan = {
  dayOfWeek: 1 | 3 | 4 | 5
  startedAt: Date
  durationMinutes: number
  startMoisture: number
  targetMoisture: number
  finalMoisture: number
  startTemperature: number
  peakTemperature: number
  startHumidity: number
  finalHumidity: number
  startWeight: number
}

type SensorReading = {
  deviceId: string
  sessionId: string
  temperature: number
  humidity: number
  moisture: number
  fanSpeed: number
  energy: number
  status: 'running'
  dryingStatus: 'running' | 'completed'
  heaterStatus: 'ON' | 'OFF'
  fan1Status: 'ON' | 'OFF'
  fan2Status: 'ON' | 'OFF'
  solarVoltage: number
  solarCurrent: number
  weight: number
  isSimulated: true
  simulationTag: string
  timestamp: Date
}

function usage(): void {
  console.log(`
Historical telemetry seeder for ${DEVICE_ID}

Usage:
  npm run seed:historical
  npm run seed:historical -- --reset
  npm run seed:historical -- --reset-only
  npm run seed:historical -- --base-date=2026-05-15

Safety:
  - Deletes only SensorData/DryingSession records where deviceId=${DEVICE_ID}, isSimulated=true, simulationTag=${SIMULATION_TAG}
  - Does not write Firebase, realtime status, commands, or device runtime state
`)
}

function parseBaseDate(): Date {
  const arg = process.argv.find(value => value.startsWith('--base-date='))
  if (!arg) return new Date()

  const date = new Date(`${arg.split('=')[1]}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid --base-date. Use YYYY-MM-DD.')
  }
  return date
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getMostRecentDay(baseDate: Date, dayOfWeek: number): Date {
  const date = new Date(baseDate)
  date.setHours(0, 0, 0, 0)

  const delta = (date.getDay() - dayOfWeek + 7) % 7
  date.setDate(date.getDate() - delta)

  return date
}

function buildSessionPlan(baseDate: Date, dayOfWeek: 1 | 3 | 4 | 5, index: number): SessionPlan {
  const date = getMostRecentDay(baseDate, dayOfWeek)
  const startHour = [8, 9, 10, 8][index] + randomInt(0, 1)
  const startMinute = randomInt(0, 35)
  date.setHours(startHour, startMinute, randomInt(0, 45), 0)

  const startMoisture = randomBetween(22.4, 26.1)
  const finalMoisture = randomBetween(12.4, 14.8)
  const targetMoisture = randomBetween(13.5, 14.2)

  return {
    dayOfWeek,
    startedAt: date,
    durationMinutes: randomInt(130, 295),
    startMoisture,
    targetMoisture,
    finalMoisture,
    startTemperature: randomBetween(28, 32),
    peakTemperature: randomBetween(39, 48),
    startHumidity: randomBetween(72, 85),
    finalHumidity: randomBetween(45, 58),
    startWeight: randomBetween(98, 125),
  }
}

function heaterStateAt(minute: number, temperature: number, peakTemperature: number): 'ON' | 'OFF' {
  const cycleMinute = minute % 18
  if (temperature < peakTemperature - 5) return 'ON'
  if (temperature > peakTemperature - 1.5) return 'OFF'
  return cycleMinute < 11 ? 'ON' : 'OFF'
}

function solarAt(timestamp: Date): { voltage: number; current: number } {
  const hour = timestamp.getHours() + timestamp.getMinutes() / 60
  const daylightCurve = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
  const cloudNoise = randomBetween(-0.08, 0.08)
  const strength = clamp(daylightCurve + cloudNoise, 0, 1)
  return {
    voltage: round(11.4 + strength * 2.9 + randomBetween(-0.18, 0.18), 2),
    current: round(0.45 + strength * 2.35 + randomBetween(-0.12, 0.12), 2),
  }
}

function generateReadings(plan: SessionPlan, sessionId: string): SensorReading[] {
  const readings: SensorReading[] = []
  const completedAt = new Date(plan.startedAt.getTime() + plan.durationMinutes * 60 * 1000)
  let timestamp = new Date(plan.startedAt)
  let previousMoisture = plan.startMoisture
  let energy = 0
  let fan2State: 'ON' | 'OFF' = 'ON'

  while (timestamp <= completedAt) {
    const elapsedMinutes = (timestamp.getTime() - plan.startedAt.getTime()) / 60000
    const progress = clamp(elapsedMinutes / plan.durationMinutes, 0, 1)
    const warmup = 1 - Math.exp(-progress * 4.2)
    const dryingCurve = 1 - Math.exp(-progress * 3.1)

    const targetTemp = plan.startTemperature + (plan.peakTemperature - plan.startTemperature) * warmup
    const temperature = round(targetTemp + Math.sin(elapsedMinutes / 8) * 0.8 + randomBetween(-0.45, 0.45), 1)

    const targetHumidity = plan.startHumidity - (plan.startHumidity - plan.finalHumidity) * dryingCurve
    const humidity = round(clamp(targetHumidity + Math.sin(elapsedMinutes / 11) * 1.8 + randomBetween(-1.25, 1.25), 38, 88), 1)

    const expectedMoisture = plan.startMoisture - (plan.startMoisture - plan.finalMoisture) * dryingCurve
    const noisyMoisture = expectedMoisture + Math.sin(elapsedMinutes / 17) * 0.12 + randomBetween(-0.08, 0.06)
    const moisture = round(clamp(Math.min(noisyMoisture, previousMoisture + 0.03), plan.finalMoisture, plan.startMoisture), 2)
    previousMoisture = moisture

    const heaterStatus = heaterStateAt(elapsedMinutes, temperature, plan.peakTemperature)
    if (Math.floor(elapsedMinutes) % 42 === 0 && elapsedMinutes > 4) {
      fan2State = fan2State === 'ON' ? 'OFF' : 'ON'
    }

    const fan1Status: 'ON' | 'OFF' = 'ON'
    const fanSpeed = fan2State === 'ON'
      ? round(randomBetween(76, 91), 1)
      : round(randomBetween(62, 75), 1)
    const solar = solarAt(timestamp)
    const intervalSeconds = randomInt(30, 120)
    const heaterKw = heaterStatus === 'ON' ? 0.07 : 0
    const fanKw = (fan1Status === 'ON' ? 0.015 : 0) + (fan2State === 'ON' ? 0.015 : 0)
    energy += (heaterKw + fanKw) * (intervalSeconds / 3600)

    readings.push({
      deviceId: DEVICE_ID,
      sessionId,
      temperature,
      humidity,
      moisture,
      fanSpeed,
      energy: round(energy, 4),
      status: 'running',
      dryingStatus: progress >= 0.995 ? 'completed' : 'running',
      heaterStatus,
      fan1Status,
      fan2Status: fan2State,
      solarVoltage: solar.voltage,
      solarCurrent: solar.current,
      weight: round(plan.startWeight - progress * randomBetween(1.2, 3.4) + randomBetween(-0.25, 0.2), 2),
      isSimulated: true,
      simulationTag: SIMULATION_TAG,
      timestamp: new Date(timestamp),
    })

    timestamp = new Date(timestamp.getTime() + intervalSeconds * 1000)
  }

  const lastReading = readings[readings.length - 1]
  const finalSolar = solarAt(completedAt)
  const finalReading: SensorReading = {
    ...(lastReading ?? {
      deviceId: DEVICE_ID,
      sessionId,
      temperature: plan.peakTemperature,
      humidity: plan.finalHumidity,
      fanSpeed: 70,
      energy: 0,
      status: 'running' as const,
      heaterStatus: 'OFF' as const,
      fan1Status: 'ON' as const,
      fan2Status: 'ON' as const,
      isSimulated: true as const,
      simulationTag: SIMULATION_TAG,
    }),
    moisture: round(plan.finalMoisture, 2),
    temperature: round(plan.peakTemperature + randomBetween(-0.6, 0.5), 1),
    humidity: round(plan.finalHumidity + randomBetween(-1, 1.2), 1),
    fanSpeed: round(randomBetween(66, 78), 1),
    energy: round((lastReading?.energy ?? 0) + randomBetween(0.001, 0.004), 4),
    dryingStatus: 'completed',
    heaterStatus: 'OFF',
    fan1Status: 'ON',
    fan2Status: 'ON',
    solarVoltage: finalSolar.voltage,
    solarCurrent: finalSolar.current,
    weight: round(plan.startWeight - randomBetween(1.8, 3.8), 2),
    timestamp: completedAt,
  }

  if (!lastReading || lastReading.timestamp.getTime() < completedAt.getTime()) {
    readings.push(finalReading)
  } else {
    readings[readings.length - 1] = finalReading
  }

  return readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

async function deleteSimulatedTelemetry(): Promise<{ sensors: number; sessions: number }> {
  const [sensors, sessions] = await Promise.all([
    SensorData.deleteMany({ deviceId: DEVICE_ID, isSimulated: true, simulationTag: SIMULATION_TAG }),
    DryingSession.deleteMany({ deviceId: DEVICE_ID, isSimulated: true, simulationTag: SIMULATION_TAG }),
  ])

  return { sensors: sensors.deletedCount ?? 0, sessions: sessions.deletedCount ?? 0 }
}

async function getSeedUserId(): Promise<mongoose.Types.ObjectId> {
  const device = await Device.findOne({ deviceId: DEVICE_ID }).select('assignedUser').lean<{ assignedUser?: mongoose.Types.ObjectId }>()
  if (device?.assignedUser) return device.assignedUser

  const user = await User.findOne({}).select('_id').lean<{ _id: mongoose.Types.ObjectId }>()
  if (user?._id) return user._id

  throw new Error(`No user/device owner found. Create ${DEVICE_ID} or run npm run seed first.`)
}

async function seedHistoricalTelemetry(): Promise<void> {
  if (process.argv.includes('--help')) {
    usage()
    return
  }

  await dbConnect()

  const deleted = await deleteSimulatedTelemetry()
  console.log(`Cleared simulated telemetry: ${deleted.sensors} readings, ${deleted.sessions} sessions`)

  if (process.argv.includes('--reset-only')) {
    console.log('Reset complete. No new telemetry inserted.')
    return
  }

  const userId = await getSeedUserId()
  const baseDate = parseBaseDate()
  const plans = SESSION_DAYS.map((day, index) => buildSessionPlan(baseDate, day, index))
  let totalReadings = 0

  for (const plan of plans) {
    const completedAt = new Date(plan.startedAt.getTime() + plan.durationMinutes * 60 * 1000)
    const placeholderSessionId = new mongoose.Types.ObjectId()
    const readings = generateReadings(plan, placeholderSessionId.toString())
    const avgTemperature = readings.reduce((sum, item) => sum + item.temperature, 0) / readings.length
    const avgHumidity = readings.reduce((sum, item) => sum + item.humidity, 0) / readings.length
    const avgFanSpeed = readings.reduce((sum, item) => sum + item.fanSpeed, 0) / readings.length
    const finalReading = readings[readings.length - 1]

    await DryingSession.create({
      _id: placeholderSessionId,
      deviceId: DEVICE_ID,
      userId,
      status: 'completed',
      grainType: 'rice',
      startMoisture: round(plan.startMoisture, 2),
      targetMoisture: round(plan.targetMoisture, 2),
      currentMoisture: finalReading.moisture,
      finalMoisture: finalReading.moisture,
      startWeight: round(plan.startWeight, 2),
      finalWeight: finalReading.weight,
      totalEnergyUsed: finalReading.energy,
      avgTemperature: round(avgTemperature, 2),
      avgHumidity: round(avgHumidity, 2),
      avgFanSpeed: round(avgFanSpeed, 2),
      dataPoints: readings.length,
      startedAt: plan.startedAt,
      completedAt,
      duration: plan.durationMinutes * 60,
      efficiency: round(clamp(
        ((plan.startMoisture - finalReading.moisture) / (plan.startMoisture - plan.targetMoisture)) * 100,
        82,
        99,
      ), 2),
      isSimulated: true,
      simulationTag: SIMULATION_TAG,
      createdAt: plan.startedAt,
      updatedAt: completedAt,
    })

    await SensorData.insertMany(readings, { ordered: true })
    totalReadings += readings.length
    console.log(`Seeded ${DAY_NAMES[plan.dayOfWeek]} session: ${readings.length} readings, ${plan.durationMinutes} min, ${round(plan.startMoisture, 1)}% -> ${finalReading.moisture}% moisture`)
  }

  console.log(`Done. Inserted ${plans.length} simulated sessions and ${totalReadings} historical readings for ${DEVICE_ID}.`)
}

seedHistoricalTelemetry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Historical telemetry seed failed:', error)
    process.exit(1)
  })
