'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/lib/auth-store'
import {
  LayoutDashboard,
  Cpu,
  Users,
  BarChart3,
  FileText,
  AlertCircle,
  Settings,
  LogOut,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Devices', href: '/dashboard/devices', icon: Cpu },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Reports', href: '/dashboard/reports', icon: FileText },
  { label: 'Alerts', href: '/dashboard/alerts', icon: AlertCircle },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <aside className="w-64 bg-white border-r border-[#e5e7eb] flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <img
            src="/logo/grain-logo.jpg"
            alt="grAIn Logo"
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-lg font-bold text-[#111827]">grAIn</h1>
            <p className="text-xs text-[#6b7280]">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-[#f0fdf4] text-[#166534] font-medium'
                  : 'text-[#6b7280] hover:bg-[#f9fafb]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-[#e5e7eb] space-y-3">
        {user && (
          <div className="px-4 py-2 bg-[#f9fafb] rounded-lg">
            <p className="text-xs text-[#6b7280] mb-1">Signed in as</p>
            <p className="text-sm font-medium text-[#111827] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-[#ef4444] rounded-lg hover:bg-red-50 transition-colors duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
