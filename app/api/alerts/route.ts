import { NextRequest } from 'next/server'
import dbConnect from '@/lib/db'
import Alert from '@/lib/models/Alert'
import Command from '@/lib/models/Command'
import { successResponse, paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/utils/cors'
import { getUserFromRequest } from '@/lib/utils/auth'
import { getQueryParams } from '@/lib/utils/validation'
import { AlertType, CommandStatus, SensorDataStatus } from '@/lib/enums'

export async function OPTIONS(request: NextRequest) {
  return addCorsHeaders(handleCorsPrelight(request) || new Response(), request.headers.get('origin') || undefined)
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Verify authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const { page, limit, skip } = getQueryParams(request)
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')
    const type = url.searchParams.get('type')
    const isRead = url.searchParams.get('isRead')

    // Build filter
    const filter: any = {}
    if (deviceId) filter.deviceId = deviceId
    if (type && [AlertType.Critical, AlertType.Warning, AlertType.Info].includes(type)) filter.type = type
    if (isRead !== null && isRead !== undefined) filter.isRead = isRead === 'true'

    // Get alerts from Alert collection
    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Alert.countDocuments(filter),
    ])

    // Also get failed/error commands as alerts
    const commandFilter: any = { status: { $in: [CommandStatus.Failed, SensorDataStatus.Error] } }
    if (deviceId) commandFilter.deviceId = deviceId
    const failedCommands = await Command.find(commandFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const commandAlerts = failedCommands.map((cmd) => ({
      id: cmd._id,
      deviceId: cmd.deviceId,
      type: AlertType.Critical as const,
      message: `Command ${cmd.command} failed for device ${cmd.deviceId}`,
      severity: 8,
      isRead: false,
      source: 'command',
      createdAt: cmd.createdAt.toISOString(),
      updatedAt: cmd.updatedAt.toISOString(),
    }))

    // Merge and sort all alerts
    const allAlerts = [
      ...alerts.map((a) => ({
        id: a._id,
        deviceId: a.deviceId,
        type: a.type,
        message: a.message,
        severity: a.severity,
        isRead: a.isRead,
        source: 'alert',
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      ...commandAlerts,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const response = paginatedResponse(allAlerts, total + commandAlerts.length, page, limit)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Alerts GET error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    // Verify authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      const response = errorResponse('Unauthorized', ErrorCodes.UNAUTHORIZED, 401)
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    const body = await request.json()
    const { deviceId, type, message, severity } = body

    // Validate required fields
    const errors: Record<string, string> = {}

    if (!deviceId || typeof deviceId !== 'string') {
      errors.deviceId = 'Device ID is required'
    }

    if (!type || ![AlertType.Critical, AlertType.Warning, AlertType.Info].includes(type)) {
      errors.type = 'Type must be critical, warning, or info'
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      errors.message = 'Message is required'
    }

    if (severity !== undefined && (typeof severity !== 'number' || severity < 0 || severity > 10)) {
      errors.severity = 'Severity must be a number between 0 and 10'
    }

    if (Object.keys(errors).length > 0) {
      const response = errorResponse(
        Object.values(errors).join(', '),
        ErrorCodes.INVALID_INPUT,
        400
      )
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Create alert
    const alert = await Alert.create({
      deviceId: deviceId.trim(),
      type,
      message: message.trim(),
      severity: severity ?? (type === AlertType.Critical ? 8 : type === AlertType.Warning ? 5 : 2),
      isRead: false,
    })

    const response = successResponse({
      id: alert._id,
      deviceId: alert.deviceId,
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      isRead: alert.isRead,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    }, 201)

    return addCorsHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    console.error('Alerts POST error:', error)
    const response = errorResponse('Internal server error', ErrorCodes.INTERNAL_ERROR, 500)
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}
