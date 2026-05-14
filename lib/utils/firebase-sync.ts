import { getRealtimeDb } from '@/lib/firebase-admin'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'

const STALE_DEVICE_TIMEOUT_MS = 2 * 60 * 1000

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
  const isActuallyRunning = sensorData.status === 'running' && Number(sensorData.fanSpeed ?? 0) > 0

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

  await db.ref(`grain/devices/${deviceId}/runtimeState`).update({
    isRunning: isActuallyRunning,
    lastSeen: Date.now(),
    currentTemperature: sensorData.temperature,
    currentHumidity: sensorData.humidity,
    currentMoisture: sensorData.moisture,
    currentWeight: sensorData.weight ?? 0,
  })
}

/**
 * Lazily mark devices offline when they have not reported recently.
 * This runs during dashboard/device list reads instead of a cron job.
 */
export async function markStaleDevicesOffline(): Promise<number> {
  await dbConnect()

  const cutoff = new Date(Date.now() - STALE_DEVICE_TIMEOUT_MS)
  const staleDevices = await Device.find({
    status: 'online',
    lastActive: { $lt: cutoff },
  }).select('deviceId').lean()

  if (staleDevices.length === 0) return 0

  await Device.updateMany(
    { deviceId: { $in: staleDevices.map(device => device.deviceId) } },
    {
      $set: {
        status: 'offline',
        'runtimeState.isRunning': false,
        'runtimeState.commandAcknowledged': true,
        'runtimeState.pendingCommand': null,
        'runtimeState.activeCommand': null,
      },
    }
  )

  const db = getRealtimeDb()
  if (db) {
    await Promise.all(staleDevices.map(async (device) => {
      await db.ref(`grain/devices/${device.deviceId}`).update({ status: 'offline' })
      await db.ref(`grain/devices/${device.deviceId}/runtimeState`).update({
        isRunning: false,
        pendingCommand: null,
        activeCommand: null,
        commandAcknowledged: true,
      })
    }))
  }

  return staleDevices.length
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
    commandStr?: string
    mode: string
    temperature?: number
    fanSpeed?: number
    fanTarget?: string
    fanAction?: string
    relayAction?: string
    stepperAction?: string
    heaterAction?: string
  }
): Promise<void> {
  const db = getRealtimeDb()
  if (!db) return

  await db.ref(`grain/commands/${deviceId}/pending/${commandId}`).set({
    command: command.command,
    commandStr: command.commandStr ?? null,
    mode: command.mode,
    temperature: command.temperature ?? null,
    fanSpeed: command.fanSpeed ?? null,
    fanTarget: command.fanTarget ?? null,
    fanAction: command.fanAction ?? null,
    relayAction: command.relayAction ?? null,
    stepperAction: command.stepperAction ?? null,
    heaterAction: command.heaterAction ?? null,
    createdAt: Date.now(),
  })

  // Write to /latest path for ESP32 real-time listener (<500ms delivery)
  await db.ref(`grain/commands/${deviceId}/latest`).set({
    commandId,
    command: command.command,
    commandStr: command.commandStr ?? null,
    mode: command.mode,
    temperature: command.temperature ?? null,
    fanSpeed: command.fanSpeed ?? null,
    fanTarget: command.fanTarget ?? null,
    fanAction: command.fanAction ?? null,
    relayAction: command.relayAction ?? null,
    stepperAction: command.stepperAction ?? null,
    heaterAction: command.heaterAction ?? null,
    issuedAt: Date.now(),
  })

  await db.ref(`grain/devices/${deviceId}/runtimeState`).update({
    pendingCommand: commandId,
    activeCommand: command.commandStr ?? command.command,
    commandAcknowledged: false,
  })
}

/**
 * Mark a command as executed by removing it from Firebase pending
 * and updating the Command model in MongoDB.
 */
export async function markCommandExecuted(
  deviceId: string,
  commandId: string,
  status: 'executed' | 'failed' | 'error' = 'executed'
): Promise<void> {
  const db = getRealtimeDb()

  // Remove from Firebase pending
  if (db) {
    await db.ref(`grain/commands/${deviceId}/pending/${commandId}`).remove()
  }

  // Update MongoDB Command status
  await dbConnect()
  const command = await Command.findByIdAndUpdate(commandId, {
    status,
    executedAt: new Date(),
    acknowledgedAt: new Date(),
  }, { new: true })

  if (!command) return

  const runtimeSet: Record<string, unknown> = {
    'runtimeState.pendingCommand': null,
    'runtimeState.activeCommand': command.commandStr ?? command.command,
    'runtimeState.commandAcknowledged': status === 'executed',
  }
  const firebaseRuntimeSet: Record<string, unknown> = {
    pendingCommand: null,
    activeCommand: command.commandStr ?? command.command,
    commandAcknowledged: status === 'executed',
    lastSeen: Date.now(),
  }

  if (status === 'executed') {
    if (command.command === 'START') {
      runtimeSet['runtimeState.isRunning'] = true
      runtimeSet['runtimeState.currentMode'] = command.mode
      runtimeSet['runtimeState.fan1State'] = 'ON'
      runtimeSet['runtimeState.fan2State'] = 'ON'
      runtimeSet['runtimeState.heaterState'] = 'ON'
      runtimeSet['runtimeState.stepperState'] = 'ON'
      Object.assign(firebaseRuntimeSet, { isRunning: true, currentMode: command.mode, fan1State: 'ON', fan2State: 'ON', heaterState: 'ON', stepperState: 'ON' })
    } else if (command.command === 'STOP') {
      runtimeSet['runtimeState.isRunning'] = false
      runtimeSet['runtimeState.fan1State'] = 'OFF'
      runtimeSet['runtimeState.fan2State'] = 'OFF'
      runtimeSet['runtimeState.heaterState'] = 'OFF'
      runtimeSet['runtimeState.stepperState'] = 'OFF'
      Object.assign(firebaseRuntimeSet, { isRunning: false, fan1State: 'OFF', fan2State: 'OFF', heaterState: 'OFF', stepperState: 'OFF' })
    } else if (command.command === 'FAN_CONTROL') {
      if (command.fanTarget === 'FAN1' || command.fanTarget === 'ALL') {
        runtimeSet['runtimeState.fan1State'] = command.fanAction
        firebaseRuntimeSet.fan1State = command.fanAction
      }
      if (command.fanTarget === 'FAN2' || command.fanTarget === 'ALL') {
        runtimeSet['runtimeState.fan2State'] = command.fanAction
        firebaseRuntimeSet.fan2State = command.fanAction
      }
    } else if (command.command === 'HEATER_CONTROL') {
      runtimeSet['runtimeState.heaterState'] = command.heaterAction
      firebaseRuntimeSet.heaterState = command.heaterAction
    } else if (command.command === 'STEPPER_CONTROL') {
      const stepperState = command.stepperAction === 'START' ? 'ON' : command.stepperAction === 'STOP' ? 'OFF' : command.stepperAction
      runtimeSet['runtimeState.stepperState'] = stepperState
      firebaseRuntimeSet.stepperState = stepperState
    } else if (command.command === 'RELAY_CONTROL') {
      runtimeSet['runtimeState.relayState'] = command.relayAction
      firebaseRuntimeSet.relayState = command.relayAction
    }
  }

  await Device.findOneAndUpdate({ deviceId }, {
    $set: runtimeSet,
    $currentDate: { 'runtimeState.lastSeen': true },
  })

  if (db) {
    await db.ref(`grain/devices/${deviceId}/runtimeState`).update(firebaseRuntimeSet)
  }
}
