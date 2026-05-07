import { withAuth } from '@/lib/utils/handler'
import { successResponse, paginatedResponse } from '@/lib/utils/response'
import { Notification } from '@/lib/models/Notification'

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const unreadOnly = url.searchParams.get('unread') === 'true'

  const filter: Record<string, unknown> = { userId: user.userId }
  if (unreadOnly) filter.isRead = false

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ])

  return paginatedResponse(notifications, total, page, limit)
})

export const PATCH = withAuth(async (req, user) => {
  const body = await req.json()
  const { ids, markAll } = body

  if (markAll) {
    await Notification.updateMany(
      { userId: user.userId, isRead: false },
      { isRead: true }
    )
  } else if (ids && Array.isArray(ids)) {
    await Notification.updateMany(
      { _id: { $in: ids }, userId: user.userId },
      { isRead: true }
    )
  }

  const unreadCount = await Notification.countDocuments({ userId: user.userId, isRead: false })
  return successResponse({ unreadCount })
})
