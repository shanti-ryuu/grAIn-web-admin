import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import bcrypt from 'bcryptjs'
import dbConnect from '../lib/db'
import User from '../lib/models/User'
import Device from '../lib/models/Device'
import SensorData from '../lib/models/SensorData'

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@grain.com',
    password: 'admin123',
    role: 'admin',
    status: 'active',
  },
  {
    name: 'Joshua Santelices',
    email: 'joshua@grain.com',
    password: 'farmer123',
    role: 'farmer',
    status: 'active',
  },
  {
    name: 'Kenneth Radin',
    email: 'kenneth@grain.com',
    password: 'farmer123',
    role: 'farmer',
    status: 'active',
  },
  {
    name: 'Prince Moya',
    email: 'prince@grain.com',
    password: 'farmer123',
    role: 'farmer',
    status: 'active',
  },
]

const seedDevices = [
  {
    deviceId: 'GR-001',
    location: 'Farm A, Plot 1',
    status: 'online',
  },
  {
    deviceId: 'GR-002',
    location: 'Farm A, Plot 2',
    status: 'online',
  },
  {
    deviceId: 'GR-003',
    location: 'Farm B, Plot 1',
    status: 'offline',
  },
  {
    deviceId: 'GR-004',
    location: 'Farm B, Plot 3',
    status: 'online',
  },
  {
    deviceId: 'GR-005',
    location: 'Farm C, Plot 2',
    status: 'online',
  },
]

async function generateSensorData(deviceId: string, count: number = 120) {
  const data = []
  const now = Date.now()
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 1000) // 1 minute intervals for realistic drying curve
    const isRunning = Math.random() > 0.2 // 80% chance of running
    
    // Realistic drying curve: moisture decreases gradually
    const baselineMoisture = 35
    const dryingProgress = (count - i) / count
    const moisture = Math.max(14, baselineMoisture - (dryingProgress * 15) + (Math.random() * 2))
    
    data.push({
      deviceId,
      temperature: 45 + Math.random() * 20, // 45-65°C (optimal for grain drying)
      humidity: 35 + Math.random() * 30, // 35-65%
      moisture: Math.round(moisture * 100) / 100,
      fanSpeed: isRunning ? 65 + Math.floor(Math.random() * 20) : 0, // 65-85% when running, 0 when idle
      energy: isRunning ? 1.5 + Math.random() * 3 : 0, // 1.5-4.5 kWh when running, 0 when idle
      status: isRunning ? 'running' : 'idle',
      solarVoltage: 11 + Math.random() * 3, // 11-14V (realistic solar panel output)
      weight: 4 + Math.random() * 3, // 4-7kg (grain load)
      timestamp,
    })
  }
  
  return data
}

async function seedDatabase() {
  try {
    await dbConnect()
    
    console.log('Starting database seeding...')
    
    // Clear existing data
    await User.deleteMany({})
    await Device.deleteMany({})
    await SensorData.deleteMany({})
    console.log('Cleared existing data')
    
    // Create users
    const hashedUsers = await Promise.all(
      seedUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12),
      }))
    )
    
    const createdUsers = await User.insertMany(hashedUsers)
    console.log(`✓ Created ${createdUsers.length} users`)
    
    // Create devices assigned to users
    const usersMap = {
      'joshua@grain.com': createdUsers[1]._id,
      'kenneth@grain.com': createdUsers[2]._id,
      'prince@grain.com': createdUsers[3]._id,
    }
    
    const devicesToCreate = [
      { ...seedDevices[0], assignedUser: usersMap['joshua@grain.com'] },
      { ...seedDevices[1], assignedUser: usersMap['kenneth@grain.com'] },
      { ...seedDevices[2], assignedUser: usersMap['joshua@grain.com'] },
      { ...seedDevices[3], assignedUser: usersMap['prince@grain.com'] },
      { ...seedDevices[4], assignedUser: usersMap['kenneth@grain.com'] },
    ]
    
    const createdDevices = await Device.insertMany(devicesToCreate)
    console.log(`✓ Created ${createdDevices.length} devices`)
    
    // Generate sensor data for each device
    let totalSensorData = 0
    for (const device of createdDevices) {
      const sensorReadings = await generateSensorData(device.deviceId)
      await SensorData.insertMany(sensorReadings)
      totalSensorData += sensorReadings.length
    }
    console.log(`✓ Created ${totalSensorData} sensor data points`)
    
    console.log('\n✅ Database seeding completed successfully!')
    console.log('\nTest Credentials:')
    console.log('Admin:')
    console.log('  Email: admin@grain.com')
    console.log('  Password: admin123')
    console.log('\nFarmer:')
    console.log('  Email: joshua@grain.com')
    console.log('  Password: farmer123')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()
