import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI!

if (!MONGO_URI) {
  throw new Error('MONGO_URI is not defined in environment variables')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.mongoose ?? {
  conn: null,
  promise: null
}

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      dbName: 'grain',
    }

    cached.promise = mongoose
      .connect(MONGO_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB Atlas connected — grain database')
        return mongoose
      })
      .catch((err) => {
        console.error('❌ MongoDB Atlas connection error:', err.message)
        cached.promise = null
        throw err
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB