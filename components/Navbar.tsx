'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, AlertTriangle, XCircle, Info, BellOff, User, Settings, LogOut, ChevronRight, Droplets, Cpu, Wheat, Menu } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useAlerts, useMarkAlertRead, useClearAllAlerts, useNotifications, useMarkNotificationsRead } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import api from '@/lib/api'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/devices': 'Devices',
  '/dashboard/sessions': 'Drying Sessions',
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

function NotifIcon({ type }: { type: string }) {
  if (type === 'drying_complete') return <Droplets className="w-4 h-4 text-green-500 shrink-0" />
  if (type === 'session_started') return <Wheat className="w-4 h-4 text-green-600 shrink-0" />
  if (type === 'session_aborted') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  if (type === 'device_offline') return <Cpu className="w-4 h-4 text-gray-500 shrink-0" />
  if (type === 'alert_critical') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  if (type === 'alert_warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
  return <Bell className="w-4 h-4 text-blue-500 shrink-0" />
}

interface TopbarProps {
  onMenuClick?: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const pageTitle = pageNames[pathname] || 'Dashboard'

  const [notifTab, setNotifTab] = useState<'alerts' | 'notifications'>('alerts')

  // Alerts
  const { data: alertsData } = useAlerts()
  const markAlertRead = useMarkAlertRead()
  const clearAllAlerts = useClearAllAlerts()

  // Push Notifications
  const { data: notificationsData } = useNotifications()
  const markNotificationsRead = useMarkNotificationsRead()

  type AlertItem = { id: string; _id?: string; deviceId?: string; type?: string; message?: string; createdAt?: string; isRead?: boolean }
  const alerts = (alertsData as { data?: AlertItem[] } | undefined)?.data || (alertsData as AlertItem[] | undefined) || []
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length

  type NotifItem = { _id: string; type: string; title: string; body: string; deviceId?: string; isRead: boolean; createdAt: string }
  const notifications: NotifItem[] = (notificationsData as { data?: NotifItem[] } | undefined)?.data || (notificationsData as NotifItem[] | undefined) || []
  const unreadNotifCount = notifications.filter(n => !n.isRead).length

  const unreadCount = unreadAlertCount + unreadNotifCount
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount)

  const handleMarkAllRead = async () => {
    try {
      if (notifTab === 'alerts') {
        await clearAllAlerts.mutateAsync()
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      } else {
        await markNotificationsRead.mutateAsync({ markAll: true })
      }
    } catch {
      toast({ title: 'Failed', description: 'Failed to mark as read', variant: 'error' })
    }
  }

  const handleMarkSingleRead = async (alertId: string, deviceId?: string) => {
    try {
      await markAlertRead.mutateAsync(alertId)
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      if (deviceId) router.push(`/dashboard/devices/${deviceId}`)
    } catch {}
  }

  const handleNotifClick = async (notif: NotifItem) => {
    if (!notif.isRead) {
      await markNotificationsRead.mutateAsync({ ids: [notif._id] })
    }
    if (notif.deviceId) router.push(`/dashboard/devices/${notif.deviceId}`)
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

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'A'

  return (
    <header className="h-14 lg:h-16 glass-header flex items-center justify-between px-4 lg:px-8 no-print">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg lg:text-xl font-semibold text-[#111827]">{pageTitle}</h1>
      </div>

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
          <PopoverContent align="end" className="w-[400px] p-0">
            {/* Tabs */}
            <div className="flex items-center border-b border-gray-100">
              <button
                onClick={() => setNotifTab('alerts')}
                className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${notifTab === 'alerts' ? 'text-green-800 border-b-2 border-green-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Alerts {unreadAlertCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px]">{unreadAlertCount}</span>}
              </button>
              <button
                onClick={() => setNotifTab('notifications')}
                className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${notifTab === 'notifications' ? 'text-green-800 border-b-2 border-green-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Notifications {unreadNotifCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px]">{unreadNotifCount}</span>}
              </button>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="px-3 text-[10px] text-green-800 hover:text-green-700 font-medium">
                  Read all
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifTab === 'alerts' ? (
                alerts.length === 0 ? (
                  <div className="py-12 text-center">
                    <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No alerts</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {alerts.slice(0, 20).map((alert) => (
                      <button
                        key={alert.id || alert._id}
                        onClick={() => handleMarkSingleRead(alert.id || alert._id!, alert.deviceId)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!alert.isRead ? 'bg-green-50/40 border-l-2 border-l-green-600' : ''}`}
                      >
                        <AlertIcon type={alert.type || 'info'} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!alert.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(alert.createdAt || '')}</p>
                        </div>
                        {!alert.isRead && <span className="w-2 h-2 bg-green-600 rounded-full mt-1.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.slice(0, 20).map((notif) => (
                      <button
                        key={notif._id}
                        onClick={() => handleNotifClick(notif)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-green-50/40 border-l-2 border-l-green-600' : ''}`}
                      >
                        <NotifIcon type={notif.type} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                        </div>
                        {!notif.isRead && <span className="w-2 h-2 bg-green-600 rounded-full mt-1.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )
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
