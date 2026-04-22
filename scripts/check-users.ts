import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import connectDB from '../lib/db'
import User from '../lib/models/User'

async function checkUsers() {
  try {
    await connectDB()
    console.log('✓ Connected to MongoDB Atlas')
    
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
