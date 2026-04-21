import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import mongoose from 'mongoose'
import User from '../lib/models/User'

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI!)
    console.log('✓ Connected to MongoDB')
    
    const users = await User.find({}, 'email role password').lean()
    console.log('✓ Users in database:')
    console.log(users)
    
    process.exit(0)
  } catch (err: any) {
    console.error('✗ Error:', err.message)
    process.exit(1)
  }
}

checkUsers()
