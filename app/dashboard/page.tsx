'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Cpu, Activity, AlertTriangle, Users, Wheat, ArrowRight } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import Card from '@/components/Card'
import { useDevices, useAnalyticsOverview, useAlerts, useUsers, useDryingSessions } from '@/hooks/useApi'
import { useEventStream } from '@/hooks/useEventStream'
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

  const [liveData, setLiveData] = useState<Record<string, Record<string, number>>>({})
  const [isLive, setIsLive] = useState(false)

  const { data: sessionsData } = useDryingSessions({ status: 'active' })
  const activeSessions = (sessionsData as { data?: unknown[] } | undefined)?.data || (sessionsData as unknown[]) || []
  const { subscribe, isConnected } = useEventStream()

  // SSE real-time sensor updates
  useEffect(() => {
    const unsub = subscribe('sensor_update', (data) => {
      const deviceId = data.deviceId as string
      setLiveData(prev => ({
        ...prev,
        [deviceId]: {
          temperature: data.temperature as number,
          humidity: data.humidity as number,
          moisture: data.moisture as number,
          fanSpeed: data.fanSpeed as number,
          status: data.status as unknown as number,
        },
      }))
      setIsLive(true)
    })
    return unsub
  }, [subscribe])

  // Stable device IDs — only re-subscribe when actual IDs change, not array reference
  const deviceIds = useMemo(
    () => (devices || []).map((d: { deviceId: string }) => d.deviceId),
    [devices]
  )

  // Real-time Firebase listener for all devices
  useEffect(() => {
    if (deviceIds.length === 0 || typeof window === 'undefined') return

    let app: ReturnType<typeof getFirebaseApp>
    try { app = getFirebaseApp() } catch { return }

    const unsubscribes: (() => void)[] = []

    import('firebase/database').then(({ getDatabase, ref, onValue }) => {
      const db = getDatabase(app)
      deviceIds.forEach((deviceId) => {
        const sensorRef = ref(db, `grain/devices/${deviceId}/sensors`)
        const unsub = onValue(sensorRef, (snapshot: { val: () => Record<string, number> | null }) => {
          const data = snapshot.val()
          if (data) {
            setLiveData(prev => ({ ...prev, [deviceId]: data }))
            setIsLive(true)
          }
        })
        unsubscribes.push(unsub)
      })
    })

    return () => { unsubscribes.forEach(u => u()) }
  }, [deviceIds])

  const totalDevices = devices?.length || 0
  const onlineDevices = useMemo(
    () => devices?.filter((d: { status: string }) => d.status === 'online').length || 0,
    [devices]
  )
  const unreadAlerts = useMemo(
    () => (alerts || []).filter((a: { isRead: boolean }) => !a.isRead).length,
    [alerts]
  )
  const totalUsers = (usersData as { total?: number })?.total || 0

  const moistureTrend = useMemo(
    () => (analyticsData?.moistureTrend || []).map((item: { time: string; value: number }) => ({ time: item.time, moisture: item.value })),
    [analyticsData?.moistureTrend]
  )
  const energyData = useMemo(
    () => (analyticsData?.energyConsumption || []).map((item: { day: string; value: number }) => ({ time: item.day, energy: item.value })),
    [analyticsData?.energyConsumption]
  )

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

  return (
    <div className="space-y-8">
      {/* Live indicator + header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-base text-gray-500">Welcome to the grAIn Admin Dashboard.</p>
        </div>
        {(isLive || isConnected) && (
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
          {Object.entries(liveData).map(([deviceId, sensors]: [string, Record<string, number | string>]) => (
            <Card key={deviceId} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">{deviceId}</p>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Temp:</span> <span className="font-medium text-gray-900">{(sensors.temperature as number | undefined)?.toFixed(1) ?? '--'}°C</span></div>
                <div><span className="text-gray-500">Moisture:</span> <span className="font-medium text-gray-900">{(sensors.moisture as number | undefined)?.toFixed(1) ?? '--'}%</span></div>
                <div><span className="text-gray-500">Humidity:</span> <span className="font-medium text-gray-900">{(sensors.humidity as number | undefined)?.toFixed(1) ?? '--'}%</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="font-medium text-green-700">{sensors.status ?? '--'}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Active Drying Sessions */}
      {Array.isArray(activeSessions) && activeSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-green-700" /> Active Sessions
            </h2>
            <button onClick={() => router.push('/dashboard/sessions')} className="text-sm text-green-800 hover:text-green-700 font-medium inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeSessions as Array<{ _id: string; deviceId: string; grainType: string; startMoisture: number; currentMoisture: number; targetMoisture: number }>).slice(0, 3).map((session) => {
              const progress = session.startMoisture > session.targetMoisture
                ? Math.min(100, Math.round(((session.startMoisture - session.currentMoisture) / (session.startMoisture - session.targetMoisture)) * 100))
                : 0
              return (
                <Card key={session._id} className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-900">{session.deviceId}</span>
                    <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{session.grainType}</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{session.currentMoisture?.toFixed(1)}% → {session.targetMoisture}%</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
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
