import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app'
import { getDatabase, Database } from 'firebase-admin/database'

let realtimeDb: Database | null = null

export function getRealtimeDb(): Database | null {
  if (realtimeDb) return realtimeDb

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    console.warn('⚠ Firebase Admin SDK not configured — missing env vars. Realtime DB disabled.')
    return null
  }

  if (!getApps().length) {
    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    }

    initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    })
  }

  realtimeDb = getDatabase()
  return realtimeDb
}

export default getRealtimeDb
