import User from '@/lib/models/User'
import Device from '@/lib/models/Device'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const DELETE = withAuth(async (request, authUser) => {
  const { ids } = await request.json()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return errorResponse('ids array is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const filteredIds = ids.filter((id: string) => id !== authUser.userId)

  await Device.updateMany(
    { assignedUser: { $in: filteredIds } },
    { $unset: { assignedUser: '' } }
  )

  const result = await User.deleteMany({ _id: { $in: filteredIds } })

  return successResponse({ deletedCount: result.deletedCount })
}, { role: 'admin' })
