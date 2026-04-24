'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Cpu, Users, AlertTriangle, BarChart3, FileText, Settings, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react'
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

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead).length
  const onlineDevices = (devices || []).filter((d: any) => d.status === 'online').length

  const badges: Record<string, number> = {
    Alerts: unreadAlerts,
    Devices: onlineDevices,
  }

  const handleLogout = () => {
    logout()
    queryClient.clear()
    router.push('/auth/login')
  }

  return (
    <aside className={`hidden lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'} glass-sidebar h-full no-print transition-all duration-300`}>
      <div className={`p-4 border-b border-gray-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <Image
            src="/logo/grain-logo.jpg"
            alt="grAIn Logo"
            width={36}
            height={36}
            className="rounded-lg object-contain shrink-0"
            quality={95}
            priority
          />
          {!collapsed && <span className="text-xl font-bold text-gray-900">grAIn</span>}
        </div>
        <button onClick={toggleCollapse} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badge = badges[item.name]
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? 'nav-item-active' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
              {!collapsed && badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  item.name === 'Alerts' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                }`}>{badge}</span>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">{badge > 9 ? '9+' : badge}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className={`p-3 border-t border-gray-100 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
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
        )}
        {collapsed && user?.profileImage && (
          <img src={user.profileImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover mb-2" />
        )}
        <button onClick={handleLogout} title="Logout" className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors`}>
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}
