import Alert from '@/lib/models/Alert'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const PATCH = withAuth(async (_request, _user, { params }) => {
  const { id } = await params
  const alert = await Alert.findByIdAndUpdate(id, { isRead: true }, { returnDocument: 'after' }).lean()

  if (!alert) {
    return errorResponse('Alert not found', ErrorCodes.NOT_FOUND, 404)
  }

  return successResponse({ id: alert._id, isRead: alert.isRead })
})
