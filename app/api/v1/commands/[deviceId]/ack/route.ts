import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { isValidDeviceId } from '@/lib/utils/validation'
import { markCommandExecuted } from '@/lib/utils/firebase-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await dbConnect()

    const { deviceId } = await params

    if (!isValidDeviceId(deviceId)) {
      return errorResponse('Invalid device ID format', ErrorCodes.INVALID_INPUT, 400)
    }

    const body = await request.json()
    const { commandId, status } = body

    if (!commandId) {
      return errorResponse('commandId is required', ErrorCodes.INVALID_INPUT, 400)
    }

    const validStatuses = ['executed', 'failed', 'error']
    const commandStatus = validStatuses.includes(status) ? status : 'executed'

    const command = await Command.findByIdAndUpdate(
      commandId,
      { status: commandStatus, executedAt: new Date() },
      { new: true }
    )

    if (!command) {
      return errorResponse('Command not found', ErrorCodes.NOT_FOUND, 404)
    }

    try {
      await markCommandExecuted(commandId, commandStatus)
    } catch (firebaseError) {
      console.error('Firebase ack sync failed:', firebaseError)
    }

    return successResponse({
      id: command._id,
      deviceId: command.deviceId,
      command: command.command,
      status: command.status,
      executedAt: command.executedAt?.toISOString?.() || null,
    })

  } catch (error) {
    console.error('Command ack error:', error)
    return errorResponse('Failed to acknowledge command', ErrorCodes.INTERNAL_ERROR, 500)
  }
}
