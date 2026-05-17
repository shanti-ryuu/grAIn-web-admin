import { getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { Notification, FCMToken } from '@/lib/models/Notification'
import mongoose from 'mongoose'

interface SendNotificationParams {
  userId: string | mongoose.Types.ObjectId
  deviceId?: string
  type: 'drying_complete' | 'alert_critical' | 'alert_warning' | 'device_offline' | 'session_started' | 'session_aborted'
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendPushNotification(params: SendNotificationParams): Promise<void> {
  const { userId, deviceId, type, title, body, data } = params

  const notification = await Notification.create({
    userId,
    deviceId,
    type,
    title,
    body,
    data,
    isRead: false,
    sentViaFCM: false,
  })

  const fcmTokens = await FCMToken.find({ userId }).lean()
  if (fcmTokens.length === 0 || !getApps().length) return

  try {
    const messaging = getMessaging()
    const tokens = fcmTokens.map(t => t.token)

    const message = {
      notification: { title, body },
      data: {
        type,
        notificationId: notification._id.toString(),
        ...(deviceId ? { deviceId } : {}),
        ...(data || {}),
      },
      tokens,
    }

    const response = await messaging.sendEachForMulticast(message)

    const tokensToRemove: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        tokensToRemove.push(tokens[idx])
      }
    })

    if (tokensToRemove.length > 0) {
      await FCMToken.deleteMany({ token: { $in: tokensToRemove } })
    }

    if (response.successCount > 0) {
      await Notification.findByIdAndUpdate(notification._id, { sentViaFCM: true })
    }
  } catch (error) {
    console.error('[FCM] Failed to send push notification:', error)
  }
}

export async function sendNotificationToDeviceOwner(
  deviceId: string,
  type: SendNotificationParams['type'],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const Device = (await import('@/lib/models/Device')).default
  const device = await Device.findOne({ deviceId }).lean()
  if (!device) return

  await sendPushNotification({
    userId: device.assignedUser,
    deviceId,
    type,
    title,
    body,
    data,
  })
}
