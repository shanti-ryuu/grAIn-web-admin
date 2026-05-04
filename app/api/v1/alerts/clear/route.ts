import Alert from '@/lib/models/Alert'
import { successResponse } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const POST = withAuth(async (request, user) => {
  await Alert.updateMany({ isRead: false }, { isRead: true })
  return successResponse({ cleared: true })
})
