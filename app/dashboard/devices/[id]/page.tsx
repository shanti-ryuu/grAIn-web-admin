'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Square, Thermometer, Droplets, Wind, Zap, Activity, Clock, Brain } from 'lucide-react'
import Card from '@/components/Card'
import Table from '@/components/Table'
import { useDevice, useSensorData, useStartDryer, useStopDryer, useCommandHistory, usePredictions } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import { getFirebaseApp } from '@/lib/firebase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DeviceStatus, CommandStatus } from '@/lib/enums'

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string

  const { data: device, isLoading: deviceLoading, error: deviceError, refetch: refetchDevice } = useDevice(id)
  const { data: sensorData, isLoading: sensorLoading } = useSensorData(device?.deviceId || '', 24)
  const { data: commandHistory } = useCommandHistory(device?.deviceId, 20)
  const { data: predictions } = usePredictions(device?.deviceId)
  const startDryer = useStartDryer()
  const stopDryer = useStopDryer()

  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('MANUAL')
  const [temperature, setTemperature] = useState(45)
  const [fanSpeed, setFanSpeed] = useState(75)

  // Real-time sensor data from Firebase
  const [liveSensors, setLiveSensors] = useState<any>(null)

  useEffect(() => {
    if (!device?.deviceId || typeof window === 'undefined') return

    let app: any
    try {
      app = getFirebaseApp()
    } catch { return }
    if (!app) return

    let db: any
    let unsubscribe: (() => void) | null = null

    import('firebase/database').then(({ getDatabase, ref, onValue }) => {
      db = getDatabase(app)
      const sensorRef = ref(db, `grain/devices/${device.deviceId}/sensors`)
      unsubscribe = onValue(sensorRef, (snapshot: any) => {
        const data = snapshot.val()
        if (data) setLiveSensors(data)
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [device?.deviceId])

  const latestSensor = liveSensors || (sensorData && sensorData.length > 0 ? sensorData[0] : null)

  const handleStart = async () => {
    try {
      await startDryer.mutateAsync({ deviceId: device.deviceId, mode, temperature, fanSpeed })
      toast({ title: 'Device started', description: `${device.deviceId} started in ${mode} mode.` })
      refetchDevice()
    } catch {
      toast({ title: 'Start failed', description: 'Failed to start device.', variant: 'destructive' })
    }
  }

  const handleStop = async () => {
    try {
      await stopDryer.mutateAsync(device.deviceId)
      toast({ title: 'Device stopped', description: `${device.deviceId} has been stopped.` })
      refetchDevice()
    } catch {
      toast({ title: 'Stop failed', description: 'Failed to stop device.', variant: 'destructive' })
    }
  }

  const isCommandLoading = startDryer.isPending || stopDryer.isPending

  if (deviceLoading || sensorLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-10 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (deviceError) {
    return (
      <div className="space-y-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Devices
        </button>
        <Card className="p-12 text-center">
          <p className="text-red-600">Failed to load device details.</p>
          <button onClick={() => refetchDevice()} className="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg text-sm">Retry</button>
        </Card>
      </div>
    )
  }

  const chartData = (sensorData || []).map((d: any) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature: d.temperature,
    moisture: d.moisture,
    humidity: d.humidity,
  }))

  const commandColumns = [
    { key: 'command', label: 'Command' },
    { key: 'mode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        v === CommandStatus.Executed ? 'bg-green-50 text-green-600' :
        v === CommandStatus.Pending ? 'bg-yellow-50 text-yellow-600' :
        v === CommandStatus.Failed || v === CommandStatus.Error ? 'bg-red-50 text-red-600' :
        'bg-gray-50 text-gray-600'
      }`}>{v}</span>
    )},
    { key: 'createdAt', label: 'Time', render: (v: string) => new Date(v).toLocaleString() },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Devices
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{device?.deviceId}</h1>
            <p className="text-base text-gray-500">
              {device?.location || 'Unknown Location'} • Assigned to {device?.assignedUser?.name || 'Unassigned'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {liveSensors && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${device?.status === DeviceStatus.Online ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Device Status</p>
              <p className="text-xs text-gray-500">{device?.status === DeviceStatus.Online ? 'Online and Operational' : 'Offline'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Last Active</p>
            <p className="text-xs text-gray-500">{device?.lastActive ? new Date(device.lastActive).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      </Card>

      {/* Real-time Sensor Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Thermometer, label: 'Temperature', value: latestSensor?.temperature?.toFixed(1) ?? '--', unit: '°C', color: 'text-red-500' },
          { icon: Droplets, label: 'Humidity', value: latestSensor?.humidity?.toFixed(1) ?? '--', unit: '%', color: 'text-blue-500' },
          { icon: Droplets, label: 'Moisture', value: latestSensor?.moisture?.toFixed(1) ?? '--', unit: '%', color: 'text-green-600' },
          { icon: Wind, label: 'Fan Speed', value: latestSensor?.fanSpeed ?? '--', unit: '%', color: 'text-gray-600' },
          { icon: Zap, label: 'Energy', value: latestSensor?.energy?.toFixed(2) ?? '--', unit: 'kWh', color: 'text-yellow-600' },
          { icon: Activity, label: 'Status', value: latestSensor?.status ?? '--', unit: '', color: 'text-green-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}<span className="text-sm font-normal text-gray-400 ml-1">{s.unit}</span></p>
          </Card>
        ))}
      </div>

      {/* Dryer Control Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dryer Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'AUTO' | 'MANUAL')}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
              <option value="MANUAL">Manual</option>
              <option value="AUTO">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Temperature: {temperature}°C</label>
            <input type="range" min={30} max={60} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-green-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fan Speed: {fanSpeed}%</label>
            <input type="range" min={0} max={100} value={fanSpeed} onChange={(e) => setFanSpeed(Number(e.target.value))}
              className="w-full accent-green-800" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleStart} disabled={isCommandLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {startDryer.isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
          </button>
          <button onClick={handleStop} disabled={isCommandLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {stopDryer.isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
          </button>
        </div>
      </Card>

      {/* Sensor Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Temperature History</h3>
          <p className="text-sm text-gray-500 mb-6">Last 24 hours</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="temperature" stroke="#166534" strokeWidth={2} dot={false} name="Temperature (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Moisture History</h3>
          <p className="text-sm text-gray-500 mb-6">Last 24 hours</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="moisture" stroke="#22c55e" strokeWidth={2} dot={false} name="Moisture (%)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* AI Prediction History */}
      {(predictions && predictions.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" /> AI Prediction History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.slice(0, 10).map((p: any) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</p>
                  {p.isDryingComplete && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">Complete</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">{p.output?.recommendation}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div><span className="text-gray-500">Confidence:</span> <span className="font-medium">{((p.output?.confidence ?? 0) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-gray-500">ETA:</span> <span className="font-medium">{p.output?.estimatedMinutesToTarget ?? '--'} min</span></div>
                  <div><span className="text-gray-500">Moisture 30m:</span> <span className="font-medium">{p.output?.predictedMoisture30min?.toFixed(1) ?? '--'}%</span></div>
                  <div><span className="text-gray-500">Efficiency:</span> <span className="font-medium">{((p.output?.efficiencyScore ?? 0) * 100).toFixed(0)}%</span></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Command History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Command History</h3>
        {(commandHistory && commandHistory.length > 0) ? (
          <Table columns={commandColumns} data={commandHistory} />
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No commands sent yet.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
