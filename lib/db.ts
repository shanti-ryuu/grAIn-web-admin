import mongoose from 'mongoose'

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

// FIX 1.3: Connection event listeners for clear logging
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected — grain database')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message)
})

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected')
  cached.conn = null
})

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    const MONGO_URI = process.env.MONGO_URI
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables')
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      dbName: 'grain',
      tls: true,
      retryWrites: true,
      w: 'majority' as const,
    }

    const connectionPromise = mongoose
      .connect(MONGO_URI, opts)
      .then((m) => {
        console.log('✅ MongoDB Atlas connected — grain database')
        return m
      })
      .catch((err) => {
        console.error('❌ MongoDB Atlas connection error:', err.message)
        cached.promise = null
        throw err
      })

    // FIX 1.3: Wrap connection attempt in 8-second timeout guard
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        cached.promise = null // Reset so next request retries fresh
        reject(new Error('MongoDB connection timeout — retrying on next request'))
      }, 8000)
    })

    cached.promise = Promise.race([connectionPromise, timeoutPromise])
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB