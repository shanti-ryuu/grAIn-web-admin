import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

function validateFirebaseConfig() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  ] as const

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.warn(
      `[Firebase] Missing environment variables: ${missing.join(', ')}. ` +
      'Firebase client SDK initialization will be skipped.'
    )
    return false
  }
  return true
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

export let app: ReturnType<typeof initializeApp> | null = null

if (getApps().length > 0) {
  app = getApp()
} else if (validateFirebaseConfig()) {
  app = initializeApp(firebaseConfig)
}

export function getFirebaseApp() {
  if (!app) {
    throw new Error('Firebase not initialized — check env vars')
  }
  return app
}

export function initFirebaseAnalytics() {
  if (typeof window === 'undefined' || !app) return
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app!)
      }
    })
    .catch(() => {
      // Analytics not supported — silently ignore
    })
}
