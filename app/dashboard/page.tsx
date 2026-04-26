'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Cpu, Activity, AlertTriangle, Users } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import Card from '@/components/Card'
import { useDevices, useAnalyticsOverview, useAlerts, useUsers } from '@/hooks/useApi'
import ErrorState from '@/components/ErrorState'
import { getFirebaseApp } from '@/lib/firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const { data: devices, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useDevices()
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useAnalyticsOverview()
  const { data: alerts } = useAlerts()
  const { data: usersData } = useUsers(1, 1)

  // Auto-refresh dashboard data every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDevices()
      refetchAnalytics()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refetchDevices, refetchAnalytics])

  const [liveData, setLiveData] = useState<Record<string, any>>({})
  const [isLive, setIsLive] = useState(false)

  // Real-time Firebase listener for all devices
  useEffect(() => {
    if (!devices || devices.length === 0 || typeof window === 'undefined') return

    let app: any
    try { app = getFirebaseApp() } catch { return }
    if (!app) return

    const unsubscribes: (() => void)[] = []

    import('firebase/database').then(({ getDatabase, ref, onValue }) => {
      const db = getDatabase(app)
      devices.forEach((d: any) => {
        const sensorRef = ref(db, `grain/devices/${d.deviceId}/sensors`)
        const unsub = onValue(sensorRef, (snapshot: any) => {
          const data = snapshot.val()
          if (data) {
            setLiveData(prev => ({ ...prev, [d.deviceId]: data }))
            setIsLive(true)
          }
        })
        unsubscribes.push(unsub)
      })
    })

    return () => { unsubscribes.forEach(u => u()) }
  }, [devices])

  const totalDevices = devices?.length || 0
  const onlineDevices = devices?.filter((d: any) => d.status === 'online').length || 0
  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead).length
  const totalUsers = (usersData as any)?.total || 0

  if (devicesLoading || analyticsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4" /><div className="h-10 bg-gray-200 rounded w-16 mb-2" /><div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (devicesError || analyticsError) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1><p className="text-base text-gray-500">Welcome to the grAIn Admin Dashboard.</p></div>
        <ErrorState message="Failed to load dashboard data." onRetry={() => { refetchDevices(); refetchAnalytics() }} />
      </div>
    )
  }

  if (totalDevices === 0) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1><p className="text-base text-gray-500">Get started by registering your first device.</p></div>
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cpu className="w-8 h-8 text-green-800" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Yet</h3>
          <p className="text-sm text-gray-500 mb-6">Register your first device to start monitoring.</p>
          <button onClick={() => router.push('/dashboard/devices')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            <Cpu className="w-4 h-4" /> Register Device
          </button>
        </Card>
      </div>
    )
  }

  const moistureTrend = (analyticsData?.moistureTrend || []).map((item: any) => ({ time: item.time, moisture: item.value }))
  const energyData = (analyticsData?.energyConsumption || []).map((item: any) => ({ time: item.day, energy: item.value }))

  return (
    <div className="space-y-8">
      {/* Live indicator + header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-base text-gray-500">Welcome to the grAIn Admin Dashboard.</p>
        </div>
        {isLive && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Devices" value={totalDevices.toString()} subtitle="Registered devices" icon={<Cpu className="w-5 h-5" />} />
        <MetricCard title="Online Devices" value={onlineDevices.toString()} subtitle={`${totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}% online`} icon={<Activity className="w-5 h-5" />} />
        <MetricCard title="Active Users" value={totalUsers.toString()} subtitle="Registered users" icon={<Users className="w-5 h-5" />} />
        <MetricCard title="Unread Alerts" value={unreadAlerts.toString()} subtitle="System alerts" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Live Device Cards */}
      {Object.keys(liveData).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(liveData).map(([deviceId, sensors]: [string, any]) => (
            <Card key={deviceId} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">{deviceId}</p>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Temp:</span> <span className="font-medium text-gray-900">{sensors.temperature?.toFixed(1) ?? '--'}°C</span></div>
                <div><span className="text-gray-500">Moisture:</span> <span className="font-medium text-gray-900">{sensors.moisture?.toFixed(1) ?? '--'}%</span></div>
                <div><span className="text-gray-500">Humidity:</span> <span className="font-medium text-gray-900">{sensors.humidity?.toFixed(1) ?? '--'}%</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-medium text-green-700">{sensors.status ?? '--'}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 glass-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Moisture Trend</h3>
          <p className="text-sm text-gray-500 mb-6">Last 24 hours (hourly avg)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={moistureTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="moisture" stroke="#166534" strokeWidth={2} dot={false} name="Moisture (%)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 glass-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Energy Consumption</h3>
          <p className="text-sm text-gray-500 mb-6">Last 7 days (daily total)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="energy" stroke="#22c55e" strokeWidth={2} dot={false} name="Energy (kWh)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
