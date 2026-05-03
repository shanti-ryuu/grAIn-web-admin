'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, AlertTriangle, XCircle, Info, BellOff, User, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useAlerts, useMarkAlertRead, useClearAllAlerts } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/devices': 'Devices',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/reports': 'Reports',
  '/dashboard/users': 'Users',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/settings': 'Settings',
  '/dashboard/profile': 'Profile',
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function AlertIcon({ type }: { type: string }) {
  if (type === 'critical') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const pageTitle = pageNames[pathname] || 'Dashboard'

  // FIX 5: Notification bell data
  const { data: alertsData } = useAlerts()
  const markAlertRead = useMarkAlertRead()
  const clearAllAlerts = useClearAllAlerts()

  const alerts = (alertsData as any)?.data || alertsData || []
  const unreadCount = alerts.filter((a: any) => !a.isRead).length
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount)

  const handleMarkAllRead = async () => {
    try {
      await clearAllAlerts.mutateAsync()
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    } catch {
      toast({ title: 'Failed', description: 'Failed to mark notifications as read', variant: 'error' })
    }
  }

  const handleMarkSingleRead = async (alertId: string, deviceId?: string) => {
    try {
      await markAlertRead.mutateAsync(alertId)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      if (deviceId) router.push(`/dashboard/devices/${deviceId}`)
    } catch {}
  }

  const handleLogout = () => {
    logout()
    queryClient.clear()
    router.push('/auth/login')
  }

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'A'

  return (
    <header className="h-16 glass-header flex items-center justify-between px-8 no-print">
      <h1 className="text-xl font-semibold text-[#111827]">{pageTitle}</h1>

      <div className="flex items-center gap-6">
        {/* FIX 5: Notification Bell with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 hover:bg-[#f9fafb] rounded-lg transition-colors duration-200">
              <Bell className="w-5 h-5 text-[#6b7280]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#ef4444] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                  {badgeText}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[380px] p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} disabled={clearAllAlerts.isPending}
                  className="text-xs text-green-800 hover:text-green-700 font-medium disabled:opacity-50">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {alerts.slice(0, 20).map((alert: any) => (
                    <button
                      key={alert.id}
                      onClick={() => handleMarkSingleRead(alert.id, alert.deviceId)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!alert.isRead ? 'bg-green-50/40 border-l-2 border-l-green-600' : ''}`}
                    >
                      <AlertIcon type={alert.type} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!alert.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(alert.createdAt)}</p>
                      </div>
                      {!alert.isRead && <span className="w-2 h-2 bg-green-600 rounded-full mt-1.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-[#e5e7eb]" />

        {/* FIX 6: User area with profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#111827]">{user?.name || 'Admin'}</p>
                <p className="text-xs text-[#6b7280]">{user?.role === 'admin' ? 'Administrator' : 'Farmer'}</p>
              </div>
              {user?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-[#166534] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {userInitial}
                </div>
              )}
              <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" collisionPadding={8}>
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              <User className="w-4 h-4" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="w-4 h-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
