import { getRealtimeDb } from '@/lib/firebase-admin'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import Device from '@/lib/models/Device'
import { CommandStatus, CommandType, DeviceStatus, FanAction, FanTarget, SensorDataStatus, StepperAction } from '@/lib/enums'

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
  const isActuallyRunning = sensorData.status === SensorDataStatus.Running && Number(sensorData.fanSpeed ?? 0) > 0

  await db.ref(`grain/devices/${deviceId}/sensors`).set({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    moisture: sensorData.moisture,
    fanSpeed: sensorData.fanSpeed ?? 0,
    energy: sensorData.energy ?? 0,
    status: sensorData.status ?? SensorDataStatus.Idle,
    solarVoltage: sensorData.solarVoltage ?? 0,
    weight: sensorData.weight ?? 0,
    updatedAt: Date.now(),
  })

  // Update device status and lastActive
  await db.ref(`grain/devices/${deviceId}`).update({
    status: DeviceStatus.Online,
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
    status: DeviceStatus.Online,
    lastActive: { $lt: cutoff },
  }).select('deviceId').lean()

  if (staleDevices.length === 0) return 0

  await Device.updateMany(
    { deviceId: { $in: staleDevices.map(device => device.deviceId) } },
    {
      $set: {
        status: DeviceStatus.Offline,
        'runtimeState.isRunning': false,
        'runtimeState.commandAcknowledged': true,
        'runtimeState.pendingCommand': null,
        'runtimeState.activeCommand': null,
        'runtimeState.commandStatus': 'idle',
      },
    }
  )

  const db = getRealtimeDb()
  if (db) {
    await Promise.all(staleDevices.map(async (device) => {
      await db.ref(`grain/devices/${device.deviceId}`).update({ status: DeviceStatus.Offline })
      await db.ref(`grain/devices/${device.deviceId}/runtimeState`).update({
        isRunning: false,
        pendingCommand: null,
        activeCommand: null,
        commandStatus: 'idle',
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

  const now = Date.now()
  const commandPayload = {
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
  }

  await Promise.all([
    db.ref(`grain/commands/${deviceId}/pending/${commandId}`).set({
      ...commandPayload,
      createdAt: now,
    }),
    // Write to /latest path for ESP32 real-time listener (<500ms delivery)
    db.ref(`grain/commands/${deviceId}/latest`).set({
      commandId,
      ...commandPayload,
      issuedAt: now,
    }),
    db.ref(`grain/devices/${deviceId}/runtimeState`).update({
      pendingCommand: commandId,
      activeCommand: command.commandStr ?? command.command,
      lastCommand: command.commandStr ?? command.command,
      commandStatus: CommandStatus.Pending,
      commandAcknowledged: false,
      updatedAt: now,
    }),
  ])
}

export async function markCommandPolled(deviceId: string, commandId: string): Promise<void> {
  const db = getRealtimeDb()
  const now = new Date()

  await dbConnect()
  const command = await Command.findOneAndUpdate(
    { _id: commandId, deviceId, status: CommandStatus.Pending },
    { $set: { status: CommandStatus.Polled, polledAt: now } },
    { returnDocument: 'after' }
  )

  if (!command) return

  await Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        status: DeviceStatus.Online,
        lastActive: now,
        'runtimeState.lastSeen': now,
        'runtimeState.lastHeartbeat': now,
        'runtimeState.updatedAt': now,
        'runtimeState.pendingCommand': commandId,
        'runtimeState.activeCommand': command.commandStr ?? command.command,
        'runtimeState.lastCommand': command.commandStr ?? command.command,
        'runtimeState.commandStatus': CommandStatus.Polled,
        'runtimeState.commandAcknowledged': false,
      },
    }
  )

  if (db) {
    const nowMs = now.getTime()
    await Promise.all([
      db.ref(`grain/commands/${deviceId}/pending/${commandId}`).update({
        status: CommandStatus.Polled,
        polledAt: nowMs,
      }),
      db.ref(`grain/devices/${deviceId}`).update({
        status: DeviceStatus.Online,
        lastActive: nowMs,
      }),
      db.ref(`grain/devices/${deviceId}/runtimeState`).update({
        lastSeen: nowMs,
        lastHeartbeat: nowMs,
        updatedAt: nowMs,
        pendingCommand: commandId,
        activeCommand: command.commandStr ?? command.command,
        lastCommand: command.commandStr ?? command.command,
        commandStatus: CommandStatus.Polled,
        commandAcknowledged: false,
      }),
    ])
  }
}

/**
 * Mark a command as executed by removing it from Firebase pending
 * and updating the Command model in MongoDB.
 */
export async function markCommandExecuted(
  deviceId: string,
  commandId: string,
  status: CommandStatus.Executed | CommandStatus.Failed | CommandStatus.Timeout | CommandStatus.Error = CommandStatus.Executed
): Promise<void> {
  const db = getRealtimeDb()

  // Remove from Firebase pending
  if (db) {
    await db.ref(`grain/commands/${deviceId}/pending/${commandId}`).remove()
  }

  // Update MongoDB Command status
  await dbConnect()
  const commandUpdate: Record<string, unknown> = {
    status,
    executedAt: new Date(),
  }
  if (status === CommandStatus.Executed) {
    commandUpdate.acknowledgedAt = new Date()
  }
  const command = await Command.findByIdAndUpdate(commandId, commandUpdate, { returnDocument: 'after' })

  if (!command) return

  const runtimeSet: Record<string, unknown> = {
    'runtimeState.pendingCommand': null,
    'runtimeState.activeCommand': command.commandStr ?? command.command,
    'runtimeState.lastCommand': command.commandStr ?? command.command,
    'runtimeState.commandStatus': status,
    'runtimeState.commandAcknowledged': status === CommandStatus.Executed,
    'runtimeState.updatedAt': new Date(),
  }
  const firebaseRuntimeSet: Record<string, unknown> = {
    pendingCommand: null,
    activeCommand: command.commandStr ?? command.command,
    lastCommand: command.commandStr ?? command.command,
    commandStatus: status,
    commandAcknowledged: status === CommandStatus.Executed,
    lastSeen: Date.now(),
    updatedAt: Date.now(),
  }

  if (status === CommandStatus.Executed) {
    if (command.command === CommandType.Start) {
      runtimeSet['runtimeState.isRunning'] = true
      runtimeSet['runtimeState.currentMode'] = command.mode
      runtimeSet['runtimeState.fan1State'] = FanAction.On
      runtimeSet['runtimeState.fan2State'] = FanAction.On
      runtimeSet['runtimeState.heaterState'] = FanAction.On
      runtimeSet['runtimeState.stepperState'] = FanAction.On
      Object.assign(firebaseRuntimeSet, { isRunning: true, currentMode: command.mode, fan1State: FanAction.On, fan2State: FanAction.On, heaterState: FanAction.On, stepperState: FanAction.On })
    } else if (command.command === CommandType.Stop) {
      runtimeSet['runtimeState.isRunning'] = false
      runtimeSet['runtimeState.fan1State'] = FanAction.Off
      runtimeSet['runtimeState.fan2State'] = FanAction.Off
      runtimeSet['runtimeState.heaterState'] = FanAction.Off
      runtimeSet['runtimeState.stepperState'] = FanAction.Off
      Object.assign(firebaseRuntimeSet, { isRunning: false, fan1State: FanAction.Off, fan2State: FanAction.Off, heaterState: FanAction.Off, stepperState: FanAction.Off })
    } else if (command.command === CommandType.FanControl) {
      if (command.fanTarget === FanTarget.Fan1 || command.fanTarget === FanTarget.All) {
        runtimeSet['runtimeState.fan1State'] = command.fanAction
        firebaseRuntimeSet.fan1State = command.fanAction
      }
      if (command.fanTarget === FanTarget.Fan2 || command.fanTarget === FanTarget.All) {
        runtimeSet['runtimeState.fan2State'] = command.fanAction
        firebaseRuntimeSet.fan2State = command.fanAction
      }
    } else if (command.command === CommandType.HeaterControl) {
      runtimeSet['runtimeState.heaterState'] = command.heaterAction
      firebaseRuntimeSet.heaterState = command.heaterAction
    } else if (command.command === CommandType.StepperControl) {
      const stepperState = command.stepperAction === StepperAction.Start ? FanAction.On : command.stepperAction === StepperAction.Stop ? FanAction.Off : command.stepperAction
      runtimeSet['runtimeState.stepperState'] = stepperState
      firebaseRuntimeSet.stepperState = stepperState
    } else if (command.command === CommandType.RelayControl) {
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
