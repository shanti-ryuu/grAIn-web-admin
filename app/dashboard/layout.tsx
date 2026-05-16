'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Navbar'
import FullScreenLoader from '@/components/FullScreenLoader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { token, user, isHydrated } = useAuthStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (isHydrated && (!token || !user)) {
      router.replace('/auth/login')
    }
  }, [isHydrated, router, token, user])

  if (!isHydrated) {
    return <FullScreenLoader />
  }

  if (!token || !user) {
    return null
  }

  return (
    <div className="flex h-screen dashboard-bg">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
