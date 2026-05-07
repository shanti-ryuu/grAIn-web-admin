import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'
import { getRealtimeDb } from '@/lib/firebase-admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const { id } = await params

    if (!isValidDeviceId(id)) {
      return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
    }

    const device = await Device.findOneAndUpdate(
      { deviceId: id },
      { status: 'online', lastActive: new Date() },
      { new: true }
    )

    if (!device) {
      return errorResponse(`Device ${id} not found`, ErrorCodes.DEVICE_NOT_FOUND, 404)
    }

    // Update Firebase Realtime Database
    try {
      const firebaseDb = getRealtimeDb()
      if (firebaseDb) {
        await firebaseDb.ref(`grain/devices/${id}`).update({
          status: 'online',
          lastActive: new Date().toISOString(),
        })
      }
    } catch (firebaseError) {
      console.error('Firebase heartbeat sync failed:', firebaseError)
    }

    // Return count of pending commands
    const pendingCommands = await Command.countDocuments({
      deviceId: id,
      status: 'pending',
    })

    return successResponse({
      deviceId: id,
      status: 'online',
      lastActive: device.lastActive?.toISOString?.() || null,
      pendingCommands,
    })

  } catch (error) {
    console.error('Heartbeat error:', error)
    return errorResponse('Heartbeat processing failed', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
