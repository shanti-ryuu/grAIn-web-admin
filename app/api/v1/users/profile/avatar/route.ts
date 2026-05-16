import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const POST = withAuth(async (request, user) => {
  const { image } = await request.json()

  if (!image) {
    return errorResponse('Image is required', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!image.startsWith('data:image/')) {
    return errorResponse('Invalid image format — must be base64 data URI starting with data:image/', ErrorCodes.INVALID_INPUT, 400)
  }

  const maxSize = 2 * 1024 * 1024
  const base64Data = image.split(',')[1]
  if (base64Data && Buffer.from(base64Data, 'base64').length > maxSize) {
    return errorResponse('Image too large — max 2MB', ErrorCodes.INVALID_INPUT, 400)
  }

  const updatedUser = await User.findByIdAndUpdate(user.userId, { profileImage: image }, { returnDocument: 'after' }).select('-password')
  if (!updatedUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  return successResponse({ profileImage: updatedUser.profileImage })
})
