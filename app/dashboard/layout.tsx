'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Navbar'
import { FullScreenLoader } from '@/components/FullScreenLoader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { token, user, isHydrated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated) return // Wait for localStorage rehydration
    if (!token || !user) {
      router.replace('/auth/login')
    }
  }, [isHydrated, token, user, router])

  // Show nothing while hydrating to prevent flash of protected content
  if (!isHydrated) return <FullScreenLoader />

  // If not authenticated, render nothing (redirect is in progress)
  if (!token || !user) return null

  return (
    <div className="flex h-screen dashboard-bg">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
