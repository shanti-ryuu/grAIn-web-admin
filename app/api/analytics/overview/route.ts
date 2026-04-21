import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import SensorData from '@/lib/models/SensorData'
import Device from '@/lib/models/Device'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get date range (default to last 7 days)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    let matchCondition: any = {
      timestamp: { $gte: startDate },
    }

    // If not admin, only show data for user's devices
    if (user.role !== 'admin') {
      const userDevices = await Device.find({ assignedUser: user.userId }).select('deviceId')
      const deviceIds = userDevices.map(d => d.deviceId)
      matchCondition.deviceId = { $in: deviceIds }
    }

    // Aggregate sensor data
    const analytics = await SensorData.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            deviceId: '$deviceId',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp',
              },
            },
          },
          avgTemperature: { $avg: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          avgMoisture: { $avg: '$moisture' },
          count: { $sum: 1 },
          minTemperature: { $min: '$temperature' },
          maxTemperature: { $max: '$temperature' },
          minHumidity: { $min: '$humidity' },
          maxHumidity: { $max: '$humidity' },
          minMoisture: { $min: '$moisture' },
          maxMoisture: { $max: '$moisture' },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ])

    // Get device count
    const deviceCount = await Device.countDocuments(
      user.role === 'admin' ? {} : { assignedUser: user.userId }
    )

    // Get online device count
    const onlineDeviceCount = await Device.countDocuments({
      ...(user.role === 'admin' ? {} : { assignedUser: user.userId }),
      status: 'online',
    })

    // Get latest sensor readings
    const latestReadings = await SensorData.find(matchCondition)
      .sort({ timestamp: -1 })
      .limit(10)

    return NextResponse.json({
      analytics,
      summary: {
        deviceCount,
        onlineDeviceCount,
        totalReadings: analytics.length,
      },
      latestReadings,
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}