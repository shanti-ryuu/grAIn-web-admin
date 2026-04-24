'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/devices': 'Devices',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/reports': 'Reports',
  '/dashboard/users': 'Users',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/settings': 'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const pageTitle = pageNames[pathname] || 'Dashboard'

  return (
    <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 no-print">
      {/* Title */}
      <h1 className="text-xl font-semibold text-[#111827]">{pageTitle}</h1>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        {/* Notification Icon */}
        <button className="relative p-2 hover:bg-[#f9fafb] rounded-lg transition-colors duration-200">
          <Bell className="w-5 h-5 text-[#6b7280]" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[#e5e7eb]" />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[#111827]">{user?.name || 'Admin'}</p>
            <p className="text-xs text-[#6b7280]">{user?.role === 'admin' ? 'Administrator' : 'Farmer'}</p>
          </div>
          <div className="w-8 h-8 bg-[#166534] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  )
}
