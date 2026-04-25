import { getRealtimeDb } from '@/lib/firebase-admin'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'

/**
 * Push live sensor data to Firebase Realtime Database.
 * Called after saving SensorData to MongoDB.
 */
export async function syncSensorToFirebase(
  deviceId: string,
  sensorData: {
    temperature: number
    humidity: number
    moisture: number
    fanSpeed?: number
    energy?: number
    status?: string
    solarVoltage?: number
    weight?: number
  }
): Promise<void> {
  const db = getRealtimeDb()
  if (!db) return

  await db.ref(`grain/devices/${deviceId}/sensors`).set({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    moisture: sensorData.moisture,
    fanSpeed: sensorData.fanSpeed ?? 0,
    energy: sensorData.energy ?? 0,
    status: sensorData.status ?? 'idle',
    solarVoltage: sensorData.solarVoltage ?? 0,
    weight: sensorData.weight ?? 0,
    updatedAt: Date.now(),
  })

  // Update device status and lastActive
  await db.ref(`grain/devices/${deviceId}`).update({
    status: 'online',
    lastActive: Date.now(),
  })
}

/**
 * Push a pending command to Firebase for ESP32 to poll.
 * Called after saving a Command to MongoDB.
 */
export async function pushCommandToFirebase(
  deviceId: string,
  commandId: string,
  command: {
    command: string
    mode: string
    temperature?: number
    fanSpeed?: number
  }
): Promise<void> {
  const db = getRealtimeDb()
  if (!db) return

  await db.ref(`grain/commands/${deviceId}/pending/${commandId}`).set({
    command: command.command,
    mode: command.mode,
    temperature: command.temperature ?? null,
    fanSpeed: command.fanSpeed ?? null,
    createdAt: Date.now(),
  })
}

/**
 * Mark a command as executed by removing it from Firebase pending
 * and updating the Command model in MongoDB.
 */
export async function markCommandExecuted(
  deviceId: string,
  commandId: string
): Promise<void> {
  const db = getRealtimeDb()

  // Remove from Firebase pending
  if (db) {
    await db.ref(`grain/commands/${deviceId}/pending/${commandId}`).remove()
  }

  // Update MongoDB Command status
  await dbConnect()
  await Command.findByIdAndUpdate(commandId, {
    status: 'executed',
    executedAt: new Date(),
  })
}
