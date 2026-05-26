'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import FullScreenLoader from '@/components/FullScreenLoader'

export default function Home() {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated) return
    router.replace(user ? '/dashboard' : '/auth/login')
  }, [isHydrated, router, user])

  return <FullScreenLoader />
}
  
