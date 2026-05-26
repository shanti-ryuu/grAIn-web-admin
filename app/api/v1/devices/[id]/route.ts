import Device from '@/lib/models/Device'
import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
import Alert from '@/lib/models/Alert'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { getRealtimeDb } from '@/lib/firebase-admin'
import { getDeviceLiveness } from '@/lib/utils/device-liveness'
import { markStaleDevicesOffline } from '@/lib/utils/firebase-sync'
import { expireStaleCommands } from '@/lib/utils/dryer-command'
import { UserRole } from '@/lib/enums'

export const GET = withAuth(async (_request, user, { params }) => {
  await Promise.all([
    markStaleDevicesOffline(),
    expireStaleCommands(),
  ])

  const { id } = await params

  // Support both MongoDB ObjectId and business deviceId (e.g., GR-001)
  let device
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    device = await Device.findById(id).populate('assignedUser', 'name email')
  } else {
    device = await Device.findOne({ deviceId: id }).populate('assignedUser', 'name email')
  }

  if (!device) {
    return errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
  }

  if (user.role !== UserRole.Admin && device.assignedUser?._id?.toString() !== user.userId) {
    return errorResponse('Forbidden', ErrorCodes.FORBIDDEN, 403)
  }

  const liveness = await getDeviceLiveness(device.deviceId, { status: device.status, lastActive: device.lastActive })

  return successResponse({
    id: device._id,
    deviceId: device.deviceId,
    status: liveness.status,
    isOnline: liveness.isOnline,
    location: device.location,
    runtimeState: device.runtimeState,
    lastActive: liveness.lastActive?.toISOString?.() || device.lastActive?.toISOString?.() || device.lastActive,
    assignedUser: device.assignedUser,
    createdAt: device.createdAt?.toISOString?.() || device.createdAt,
  })
})

export const DELETE = withAuth(async (_request, user, { params }) => {
  const { id } = await params

  let device
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    device = await Device.findById(id)
  } else {
    device = await Device.findOne({ deviceId: id })
  }

  if (!device) {
    return errorResponse('Device not found', ErrorCodes.DEVICE_NOT_FOUND, 404)
  }

  // Ownership check: farmers can only delete their own devices
  if (user.role !== UserRole.Admin && device.assignedUser?.toString() !== user.userId) {
    return errorResponse('Forbidden: you can only delete your own devices', ErrorCodes.FORBIDDEN, 403)
  }

  const deviceId = device.deviceId

  // Delete associated data: SensorData, Commands, Alerts
  await Promise.all([
    SensorData.deleteMany({ deviceId }),
    Command.deleteMany({ deviceId }),
    Alert.deleteMany({ deviceId }),
  ])

  // Delete the device itself
  await Device.findByIdAndDelete(device._id)

  // Remove Firebase RTDB entries (best-effort)
  try {
    const db = getRealtimeDb()
    if (db) {
      await Promise.all([
        db.ref(`grain/devices/${deviceId}`).remove(),
        db.ref(`grain/commands/${deviceId}`).remove(),
      ])
    }
  } catch (firebaseError) {
    console.warn('[DELETE /devices] Firebase cleanup failed (non-critical):', firebaseError)
  }

  return successResponse({ id: device._id, deviceId, deleted: true })
})
