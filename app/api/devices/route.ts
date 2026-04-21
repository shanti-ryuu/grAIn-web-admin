import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import Device from '@/lib/models/Device'
import User from '@/lib/models/User'

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

    let devices
    if (user.role === 'admin') {
      // Admin can see all devices
      devices = await Device.find({})
        .populate('assignedUser', 'name email')
        .sort({ createdAt: -1 })
    } else {
      // Farmers can only see their own devices
      devices = await Device.find({ assignedUser: user.userId })
        .populate('assignedUser', 'name email')
        .sort({ createdAt: -1 })
    }

    return NextResponse.json(devices)

  } catch (error) {
    console.error('Get devices error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = getUserFromToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { deviceId, assignedUser, location } = await request.json()

    if (!deviceId || !assignedUser) {
      return NextResponse.json(
        { error: 'Device ID and assigned user are required' },
        { status: 400 }
      )
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId })
    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device with this ID already exists' },
        { status: 400 }
      )
    }

    // Check if user exists
    const userExists = await User.findById(assignedUser)
    if (!userExists) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      )
    }

    // Create device
    const newDevice = await Device.create({
      deviceId,
      assignedUser,
      location,
      status: 'offline',
    })

    // Populate user data
    await newDevice.populate('assignedUser', 'name email')

    return NextResponse.json(newDevice, { status: 201 })

  } catch (error) {
    console.error('Create device error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}