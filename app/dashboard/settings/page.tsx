'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/lib/auth-store'
import { useUpdateUser, useDevices, useChangePassword } from '@/hooks/useApi'
import { Settings as SettingsIcon, Bell, Shield, Cpu, Lock } from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const { data: devices } = useDevices()

  // System Settings (persisted to localStorage)
  const [targetMoisture, setTargetMoisture] = useState(13)
  const [tempUnit, setTempUnit] = useState('C')
  const [alertTempMax, setAlertTempMax] = useState(55)
  const [alertHumidityMax, setAlertHumidityMax] = useState(80)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [alertFrequency, setAlertFrequency] = useState('immediate')

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    const saved = localStorage.getItem('grain_system_settings')
    if (saved) {
      const s = JSON.parse(saved)
      setTargetMoisture(s.targetMoisture ?? 13)
      setTempUnit(s.tempUnit ?? 'C')
      setAlertTempMax(s.alertTempMax ?? 55)
      setAlertHumidityMax(s.alertHumidityMax ?? 80)
    }
    const notifSaved = localStorage.getItem('grain_notification_settings')
    if (notifSaved) {
      const n = JSON.parse(notifSaved)
      setEmailNotifications(n.emailNotifications ?? true)
      setAlertFrequency(n.alertFrequency ?? 'immediate')
    }
  }, [])

  const handleSaveSystemSettings = () => {
    localStorage.setItem('grain_system_settings', JSON.stringify({ targetMoisture, tempUnit, alertTempMax, alertHumidityMax }))
    toast({ title: 'Settings saved', description: 'System settings updated.' })
  }

  const handleSaveNotificationSettings = () => {
    localStorage.setItem('grain_notification_settings', JSON.stringify({ emailNotifications, alertFrequency }))
    toast({ title: 'Notifications saved', description: 'Notification preferences updated.' })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: 'Mismatch', description: 'New passwords do not match.', variant: 'destructive' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      toast({ title: 'Too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    try {
      await changePassword.mutateAsync(pwForm)
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast({ title: 'Failed', description: 'Could not change password. Check your current password.', variant: 'destructive' })
    }
  }

  const onlineDevices = (devices || []).filter((d: any) => d.status === 'online')

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1><p className="text-base text-gray-500">Configure system preferences and manage your account.</p></div>

      {/* Current User Profile */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-green-800" />
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><p className="text-xs text-gray-500 mb-1">Name</p><p className="text-sm font-medium text-gray-900">{user?.name || '--'}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Email</p><p className="text-sm font-medium text-gray-900">{user?.email || '--'}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Role</p><p className="text-sm font-medium text-gray-900 capitalize">{user?.role || '--'}</p></div>
        </div>
      </Card>

      {/* System Settings */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-5 h-5 text-green-800" />
          <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Target Moisture (%)</label>
              <input type="number" value={targetMoisture} onChange={(e) => setTargetMoisture(Number(e.target.value))} min={10} max={20} step={0.5}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Unit</label>
              <select value={tempUnit} onChange={(e) => setTempUnit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alert: Max Temperature (°C)</label>
              <input type="number" value={alertTempMax} onChange={(e) => setAlertTempMax(Number(e.target.value))} min={30} max={80}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alert: Max Humidity (%)</label>
              <input type="number" value={alertHumidityMax} onChange={(e) => setAlertHumidityMax(Number(e.target.value))} min={50} max={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
            </div>
          </div>
          <div className="pt-4">
            <button onClick={handleSaveSystemSettings} className="px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">Save System Settings</button>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-green-800" />
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900">Email Notifications</p><p className="text-xs text-gray-500">Receive alerts via email</p></div>
            <button onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-green-800' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifications ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alert Frequency</label>
            <select value={alertFrequency} onChange={(e) => setAlertFrequency(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Digest</option>
            </select>
          </div>
          <div className="pt-4">
            <button onClick={handleSaveNotificationSettings} className="px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">Save Notification Settings</button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-green-800" />
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required minLength={6}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
          </div>
          <div className="pt-4">
            <button type="submit" disabled={updateUser.isPending} className="px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              {updateUser.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Card>

      {/* Connected Devices */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Cpu className="w-5 h-5 text-green-800" />
          <h2 className="text-xl font-semibold text-gray-900">Connected Devices</h2>
        </div>
        {onlineDevices.length === 0 ? (
          <p className="text-sm text-gray-500">No devices currently online.</p>
        ) : (
          <div className="space-y-3">
            {onlineDevices.map((d: any) => (
              <div key={d.deviceId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.deviceId}</p>
                    <p className="text-xs text-gray-500">{d.location || 'No location'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{d.assignedUser?.name || 'Unassigned'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
