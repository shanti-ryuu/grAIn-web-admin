import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'

export const GET = withAuth(async (request, user) => {
  const dbUser = await User.findById(user.userId)
  if (!dbUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  return successResponse({
    user: {
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
    },
  })
})