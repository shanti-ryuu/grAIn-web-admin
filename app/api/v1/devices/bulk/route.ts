import Device from '@/lib/models/Device'
import SensorData from '@/lib/models/SensorData'
import Command from '@/lib/models/Command'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { IDevice } from '@/lib/models/Device'
import { UserRole } from '@/lib/enums'

export const DELETE = withAuth(async (request, user) => {
  void user
  const { ids } = await request.json()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return errorResponse('ids array is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const devices = await Device.find({ _id: { $in: ids } }).select('deviceId').lean()
  const deviceIds = devices.map((d: IDevice) => d.deviceId)

  if (deviceIds.length > 0) {
    await Promise.all([
      SensorData.deleteMany({ deviceId: { $in: deviceIds } }),
      Command.deleteMany({ deviceId: { $in: deviceIds } }),
    ])
  }

  const result = await Device.deleteMany({ _id: { $in: ids } })

  return successResponse({ deletedCount: result.deletedCount })
}, { role: UserRole.Admin })
