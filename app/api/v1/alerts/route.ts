import Alert from '@/lib/models/Alert'
import Command from '@/lib/models/Command'
import { successResponse, paginatedResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { getQueryParams, sanitizeObject, sanitizeString } from '@/lib/utils/validation'
import { AlertType, CommandStatus } from '@/lib/enums'

const ALERT_TYPES = Object.values(AlertType)

export const GET = withAuth(async (request, user) => {
  void user
  const { page, limit, skip } = getQueryParams(request)
  const url = new URL(request.url)
  const deviceId = url.searchParams.get('deviceId')
  const type = url.searchParams.get('type')
  const isRead = url.searchParams.get('isRead')

  const filter: Record<string, unknown> = {}
  if (deviceId) filter.deviceId = deviceId
  if (type && ALERT_TYPES.includes(type as AlertType)) filter.type = type
  if (isRead !== null && isRead !== undefined) filter.isRead = isRead === 'true'

  const [alerts, total] = await Promise.all([
    Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Alert.countDocuments(filter),
  ])

  const commandFilter: Record<string, unknown> = { status: { $in: [CommandStatus.Failed, CommandStatus.Error] } }
  if (deviceId) commandFilter.deviceId = deviceId
  const failedCommands = await Command.find(commandFilter)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  const commandAlerts = failedCommands.map((cmd) => ({
    id: cmd._id,
    deviceId: cmd.deviceId,
    type: AlertType.Critical,
    message: `Command ${cmd.command} failed for device ${cmd.deviceId}`,
    severity: 8,
    isRead: false,
    source: 'command',
    createdAt: cmd.createdAt?.toISOString?.() ?? '',
    updatedAt: cmd.updatedAt?.toISOString?.() ?? '',
  }))

  const allAlerts = [
    ...alerts.map((a) => ({
      id: a._id,
      deviceId: a.deviceId,
      type: a.type,
      message: a.message,
      severity: a.severity,
      isRead: a.isRead,
      source: 'alert',
      createdAt: a.createdAt?.toISOString?.() ?? '',
      updatedAt: a.updatedAt?.toISOString?.() ?? '',
    })),
    ...commandAlerts,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const response = paginatedResponse(allAlerts, total + commandAlerts.length, page, limit)
  response.headers.set('Cache-Control', 'no-store')
  return response
})

export const POST = withAuth(async (request, user) => {
  void user
  const body = sanitizeObject(await request.json())
  const { deviceId, type, message, severity } = body

  const errors: Record<string, string> = {}

  if (!deviceId || typeof deviceId !== 'string') {
    errors.deviceId = 'Device ID is required'
  }

  if (!type || !ALERT_TYPES.includes(type as AlertType)) {
    errors.type = 'Type must be critical, warning, error, info, or success'
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    errors.message = 'Message is required'
  }

  if (severity !== undefined && (typeof severity !== 'number' || severity < 0 || severity > 10)) {
    errors.severity = 'Severity must be a number between 0 and 10'
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(Object.values(errors).join(', '), ErrorCodes.INVALID_INPUT, 400)
  }

  const alert = await Alert.create({
    deviceId: deviceId.trim(),
    type,
    message: sanitizeString(message.trim()),
    severity: severity ?? (type === AlertType.Critical ? 8 : type === AlertType.Warning ? 5 : 2),
    isRead: false,
  })

  return successResponse({
    id: alert._id,
    deviceId: alert.deviceId,
    type: alert.type,
    message: alert.message,
    severity: alert.severity,
    isRead: alert.isRead,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
  }, 201)
})
