'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { FullScreenLoader } from '@/components/FullScreenLoader'

export default function Home() {
  const router = useRouter()
  const { token, user, isHydrated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated) return
    if (token && user) {
      router.replace('/dashboard')
    } else {
      router.replace('/auth/login')
    }
  }, [isHydrated, token, user, router])

  if (!isHydrated) return <FullScreenLoader />

  return null
}
