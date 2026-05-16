'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import FullScreenLoader from '@/components/FullScreenLoader'

export default function Home() {
  const router = useRouter()
  const { token, user, isHydrated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated) return
    router.replace(token && user ? '/dashboard' : '/auth/login')
  }, [isHydrated, router, token, user])

  return <FullScreenLoader />
}
  
