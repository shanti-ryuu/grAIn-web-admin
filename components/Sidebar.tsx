'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Cpu, Users, AlertTriangle, BarChart3, FileText, Settings, LogOut, ChevronsLeft, ChevronsRight, Wheat, X } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { useAlerts, useDevices, useDryingSessions } from '@/hooks/useApi'
import Image from 'next/image'
import api from '@/lib/api'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/dashboard/devices', icon: Cpu },
  { name: 'Sessions', href: '/dashboard/sessions', icon: Wheat },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
  className?: string
}

export default function Sidebar({ mobileOpen = false, onMobileClose, className = '' }: Readonly<SidebarProps>) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: alerts } = useAlerts()
  const { data: devices } = useDevices()
  const { data: sessionsData } = useDryingSessions({ status: 'active' })

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

  const unreadAlerts = (alerts || []).filter((a: { isRead?: boolean }) => !a.isRead).length
  const onlineDevices = (devices || []).filter((d: { status?: string }) => d.status === 'online').length
  const activeSessionsList = sessionsData?.data || []
  const activeSessionCount = Array.isArray(activeSessionsList) ? activeSessionsList.length : 0

  const badges: Record<string, number> = {
    Alerts: unreadAlerts,
    Devices: onlineDevices,
    Sessions: activeSessionCount,
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Client logout should still complete if the session is already expired.
    }
    logout()
    queryClient.clear()
    router.push('/auth/login')
  }

  const handleNav = (href: string) => {
    router.push(href)
    onMobileClose?.()
  }

  // Shared nav items — used in both desktop sidebar and mobile drawer
  const NavItems = ({ showLabel }: { showLabel: boolean }) => (
    <>
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const badge = badges[item.name]
        return (
          <button
            key={item.name}
            onClick={() => handleNav(item.href)}
            title={!showLabel ? item.name : undefined}
            className={`relative w-full flex items-center gap-3 ${!showLabel ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive ? 'nav-item-active' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {showLabel && <span className="flex-1 text-left">{item.name}</span>}
            {showLabel && badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                item.name === 'Alerts' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}>{badge}</span>
            )}
            {!showLabel && badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">{badge > 9 ? '9+' : badge}</span>
            )}
          </button>
        )
      })}
    </>
  )

  // Shared user footer
  const UserFooter = ({ showLabel }: { showLabel: boolean }) => (
    <div className={`p-3 border-t border-gray-100 ${!showLabel ? 'flex flex-col items-center' : ''}`}>
      {showLabel && (
        <div className="flex items-center gap-3 mb-3">
          {user?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
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
      {!showLabel && user?.profileImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profileImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover mb-2" />
      )}
      <button
        onClick={handleLogout}
        title="Logout"
        className={`w-full flex items-center gap-3 ${!showLabel ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors`}
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {showLabel && 'Logout'}
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'} glass-sidebar h-full no-print transition-all duration-300 ${className}`}>
        <div className={`p-4 border-b border-gray-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <Image src="/logo/grain-logo.jpg" alt="grAIn Logo" width={36} height={36} className="rounded-lg object-contain shrink-0" quality={95} priority />
            {!collapsed && <span className="text-xl font-bold text-gray-900">grAIn</span>}
          </div>
          <button onClick={toggleCollapse} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItems showLabel={!collapsed} />
        </nav>

        <UserFooter showLabel={!collapsed} />
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onMobileClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 glass-sidebar z-50 flex flex-col lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Image src="/logo/grain-logo.jpg" alt="grAIn Logo" width={36} height={36} className="rounded-lg object-contain shrink-0" quality={95} priority />
            <span className="text-xl font-bold text-gray-900">grAIn</span>
          </div>
          <button onClick={onMobileClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav — scrollable so all items show on short screens */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItems showLabel={true} />
        </nav>

        <UserFooter showLabel={true} />
      </aside>
    </>
  )
}
