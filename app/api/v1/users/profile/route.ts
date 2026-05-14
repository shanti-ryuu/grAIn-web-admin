import User from '@/lib/models/User'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/response'
import { withAuth } from '@/lib/utils/handler'
import { sanitizeString } from '@/lib/utils/validation'

export const GET = withAuth(async (_request, user) => {
  const dbUser = await User.findById(user.userId).select('-password')
  if (!dbUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  return successResponse({
    id: dbUser._id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    status: dbUser.status,
    profileImage: dbUser.profileImage,
    bio: dbUser.bio,
    phoneNumber: dbUser.phoneNumber,
    location: dbUser.location,
    createdAt: dbUser.createdAt?.toISOString?.() || dbUser.createdAt,
  })
})

export const PATCH = withAuth(async (request, user) => {
  const body = await request.json()
  const allowedFields = ['name', 'bio', 'phoneNumber', 'location']
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Sanitize name, bio, location (NOT phoneNumber — it has its own format validation)
      if (['name', 'bio', 'location'].includes(field) && typeof body[field] === 'string') {
        updates[field] = sanitizeString(body[field])
      } else {
        updates[field] = body[field]
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No updatable fields provided', ErrorCodes.INVALID_INPUT, 400)
  }

  const updatedUser = await User.findByIdAndUpdate(user.userId, updates, { returnDocument: 'after' }).select('-password')
  if (!updatedUser) {
    return errorResponse('User not found', ErrorCodes.USER_NOT_FOUND, 404)
  }

  return successResponse({
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    status: updatedUser.status,
    profileImage: updatedUser.profileImage,
    bio: updatedUser.bio,
    phoneNumber: updatedUser.phoneNumber,
    location: updatedUser.location,
  })
})
