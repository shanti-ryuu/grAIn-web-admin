'use client'

import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Cpu, Users, AlertTriangle, BarChart3, FileText, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { useAlerts, useDevices } from '@/hooks/useApi'
import Image from 'next/image'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/dashboard/devices', icon: Cpu },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: alerts } = useAlerts()
  const { data: devices } = useDevices()

  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead).length
  const onlineDevices = (devices || []).filter((d: any) => d.status === 'online').length

  const badges: Record<string, number> = {
    Alerts: unreadAlerts,
    Devices: onlineDevices,
  }

  const handleLogout = () => {
    logout()
    queryClient.clear()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 h-full no-print">
      <div className="p-6 border-b border-gray-200">
        {/* FIX 7: Replace 'G' letter with actual grain-logo.jpg */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo/grain-logo.jpg"
            alt="grAIn Logo"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            quality={95}
            priority
          />
          <span className="text-xl font-bold text-gray-900">grAIn</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badge = badges[item.name]
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-green-50 text-green-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.name}</span>
              {badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  item.name === 'Alerts' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                }`}>{badge}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          {/* FIX 6: Show profileImage if available */}
          {user?.profileImage ? (
            <Image src={user.profileImage} alt="Avatar" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
              <span className="text-green-800 font-semibold text-sm">{user?.name?.charAt(0) || 'U'}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  )
}
