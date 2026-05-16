'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Square, Thermometer, Droplets, Wind, Zap, Activity, Clock, Brain, Scale, Power, RotateCw, RotateCcw, Flame, Cog } from 'lucide-react'
import Card from '@/components/Card'
import Table from '@/components/Table'
import { useDevice, useSensorData, useStartDryer, useStopDryer, useCommandHistory, usePredictions, useControlFan, useControlStepper, useControlRelay, useControlHeater } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import { getFirebaseApp } from '@/lib/firebase'
import type { User } from '@/lib/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const DEVICE_ONLINE_TIMEOUT_MS = 2 * 60 * 1000

interface LiveSensorSnapshot {
  temperature?: number
  humidity?: number
  moisture?: number
  fanSpeed?: number
  energy?: number
  solarVoltage?: number
  weight?: number
  status?: string
  updatedAt?: number | string
}

function toTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isFresh(timestamp: number | null, currentTime: number): boolean {
  return timestamp !== null && currentTime - timestamp <= DEVICE_ONLINE_TIMEOUT_MS
}

function getAssignedUserName(assignedUser: string | User | undefined): string {
  return assignedUser && typeof assignedUser === 'object' ? assignedUser.name : 'Unassigned'
}

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
  const controlFan = useControlFan()
  const controlStepper = useControlStepper()
  const controlRelay = useControlRelay()
  const controlHeater = useControlHeater()

  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('MANUAL')
  const [temperature, setTemperature] = useState(45)
  const [fanSpeed, setFanSpeed] = useState(75)
  const [fan1Status, setFan1Status] = useState<'ON' | 'OFF'>('OFF')
  const [fan2Status, setFan2Status] = useState<'ON' | 'OFF'>('OFF')
  const [relayStatus, setRelayStatus] = useState<'ON' | 'OFF'>('OFF')
  const [heaterStatus, setHeaterStatus] = useState<'ON' | 'OFF'>('OFF')

  // Real-time sensor data from Firebase
  const [liveSensors, setLiveSensors] = useState<LiveSensorSnapshot | null>(null)
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null)
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!device?.deviceId || typeof window === 'undefined') return

    let app: ReturnType<typeof getFirebaseApp>
    try {
      app = getFirebaseApp()
    } catch { return }

    let unsubscribe: (() => void) | null = null

    import('firebase/database').then(({ getDatabase, ref, onValue }) => {
      const db = getDatabase(app)
      const deviceRef = ref(db, `grain/devices/${device.deviceId}`)
      unsubscribe = onValue(deviceRef, (snapshot: { val: () => { sensors?: LiveSensorSnapshot; status?: string; lastActive?: number | string } | null }) => {
        const data = snapshot.val()
        setLiveSensors(data?.sensors ?? null)
        setFirebaseStatus(data?.status ?? null)
        const sensorUpdatedAt = toTimestampMs(data?.sensors?.updatedAt)
        const lastActive = toTimestampMs(data?.lastActive)
        const latestHeartbeat = Math.max(sensorUpdatedAt ?? 0, lastActive ?? 0)
        setLastHeartbeatAt(latestHeartbeat > 0 ? latestHeartbeat : null)
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [device?.deviceId])

  const isDeviceOnline = firebaseStatus === 'online' && isFresh(lastHeartbeatAt, now)
  const latestSensor = isDeviceOnline ? liveSensors : null
  const lastActiveDisplay = lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleString() : device?.lastActive ? new Date(device.lastActive).toLocaleString() : 'Never'
  const isRunning = isDeviceOnline && (latestSensor?.status === 'running' || latestSensor?.status === 'drying')

  const handleStart = async () => {
    if (!device) return
    try {
      await startDryer.mutateAsync({ deviceId: device.deviceId, mode, temperature, fanSpeed })
      toast({ title: 'Device started', description: `${device.deviceId} started in ${mode} mode.` })
      refetchDevice()
    } catch {
      toast({ title: 'Start failed', description: 'Failed to start device.', variant: 'error' })
    }
  }

  const handleStop = async () => {
    if (!device) return
    try {
      await stopDryer.mutateAsync(device.deviceId)
      toast({ title: 'Device stopped', description: `${device.deviceId} has been stopped.` })
      refetchDevice()
    } catch {
      toast({ title: 'Stop failed', description: 'Failed to stop device.', variant: 'error' })
    }
  }

  const handleFanControl = async (fanTarget: 'FAN1' | 'FAN2' | 'ALL', fanAction: 'ON' | 'OFF') => {
    if (!device) return
    try {
      await controlFan.mutateAsync({ deviceId: device.deviceId, fanTarget, fanAction })
      if (fanTarget === 'FAN1' || fanTarget === 'ALL') setFan1Status(fanAction)
      if (fanTarget === 'FAN2' || fanTarget === 'ALL') setFan2Status(fanAction)
    } catch {
      // Toast handled by mutation
    }
  }

  const handleStepperControl = async (stepperAction: 'START' | 'STOP' | 'CW' | 'CCW') => {
    if (!device) return
    try {
      await controlStepper.mutateAsync({ deviceId: device.deviceId, stepperAction })
    } catch {
      // Toast handled by mutation
    }
  }

  const handleRelayControl = async (relayAction: 'ON' | 'OFF') => {
    if (!device) return
    try {
      await controlRelay.mutateAsync({ deviceId: device.deviceId, relayAction })
      setRelayStatus(relayAction)
    } catch {
      // Toast handled by mutation
    }
  }

  const handleHeaterControl = async (heaterAction: 'ON' | 'OFF') => {
    if (!device) return
    try {
      await controlHeater.mutateAsync({ deviceId: device.deviceId, heaterAction })
      setHeaterStatus(heaterAction)
    } catch {
      // Toast handled by mutation
    }
  }

  const isCommandLoading = startDryer.isPending || stopDryer.isPending
  const isAdvancedCommandLoading = controlFan.isPending || controlStepper.isPending || controlRelay.isPending || controlHeater.isPending

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

  if (!device) {
    return (
      <div className="space-y-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Devices
        </button>
        <Card className="p-12 text-center">
          <p className="text-gray-600">Device not found.</p>
        </Card>
      </div>
    )
  }

  const chartData = (sensorData || []).map((d: { timestamp: string; temperature?: number; moisture?: number; humidity?: number }) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature: d.temperature,
    moisture: d.moisture,
    humidity: d.humidity,
  }))

  const commandColumns = [
    { key: 'command', label: 'Command' },
    { key: 'commandStr', label: 'Arduino', render: (v: string) => v || '—' },
    { key: 'action', label: 'Action', render: (_v: string, row: { fanTarget?: string; fanAction?: string; relayAction?: string; stepperAction?: string; heaterAction?: string }) => {
      if (row.fanTarget && row.fanAction) return `${row.fanTarget} ${row.fanAction}`
      if (row.relayAction) return `Relay ${row.relayAction}`
      if (row.stepperAction) return `Stepper ${row.stepperAction}`
      if (row.heaterAction) return `Heater ${row.heaterAction}`
      return '—'
    }},
    { key: 'mode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        v === 'executed' ? 'bg-green-50 text-green-600' :
        v === 'pending' || v === 'polled' || v === 'executing' ? 'bg-yellow-50 text-yellow-600' :
        v === 'failed' || v === 'timeout' || v === 'error' ? 'bg-red-50 text-red-600' :
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
              {device.location || 'Unknown Location'} • Assigned to {getAssignedUserName(device.assignedUser)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDeviceOnline && liveSensors && (
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
            <div className={`w-3 h-3 rounded-full ${isDeviceOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Device Status</p>
              <p className="text-xs text-gray-500">{isDeviceOnline ? (isRunning ? 'Online and Running' : 'Online and Idle') : 'Offline'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Last Active</p>
            <p className="text-xs text-gray-500">{lastActiveDisplay}</p>
          </div>
        </div>
      </Card>

      {/* Real-time Sensor Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {[
          { icon: Thermometer, label: 'Temperature', value: latestSensor?.temperature?.toFixed(1) ?? '--', unit: '°C', color: 'text-red-500' },
          { icon: Droplets, label: 'Humidity', value: latestSensor?.humidity?.toFixed(1) ?? '--', unit: '%', color: 'text-blue-500' },
          { icon: Droplets, label: 'Moisture', value: latestSensor?.moisture?.toFixed(1) ?? '--', unit: '%', color: 'text-green-600' },
          { icon: Wind, label: 'Fan Speed', value: latestSensor?.fanSpeed ?? '--', unit: '%', color: 'text-gray-600' },
          { icon: Zap, label: 'Energy', value: latestSensor?.energy?.toFixed(2) ?? '--', unit: 'kWh', color: 'text-yellow-600' },
          { icon: Scale, label: 'Grain Weight', value: latestSensor?.weight && latestSensor.weight > 0 ? latestSensor.weight.toFixed(1) : '--', unit: 'kg', color: 'text-blue-600' },
          { icon: Activity, label: 'Status', value: isDeviceOnline ? latestSensor?.status ?? 'online' : 'offline', unit: '', color: isDeviceOnline ? 'text-green-700' : 'text-gray-500' },
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

      {/* Advanced Hardware Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Advanced Controls</h3>
            <p className="text-sm text-gray-500">Fan groups, stepper motor, auger relay, and heater commands.</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDeviceOnline ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isDeviceOnline ? 'Prototype online' : 'Prototype offline'}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wind className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Fan Controls</p>
            </div>
            {[
              { label: 'Fan 1', target: 'FAN1' as const, status: fan1Status },
              { label: 'Fan 2', target: 'FAN2' as const, status: fan2Status },
              { label: 'All Fans', target: 'ALL' as const, status: fan1Status === 'ON' && fan2Status === 'ON' ? 'ON' : 'OFF' },
            ].map((fanControl) => (
              <div key={fanControl.target} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-t-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{fanControl.label}</p>
                  <p className={`text-xs font-semibold ${fanControl.status === 'ON' ? 'text-green-700' : 'text-gray-400'}`}>{fanControl.status}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFanControl(fanControl.target, 'ON')}
                    disabled={isAdvancedCommandLoading}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-800 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    ON
                  </button>
                  <button
                    onClick={() => handleFanControl(fanControl.target, 'OFF')}
                    disabled={isAdvancedCommandLoading}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    OFF
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Cog className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Stepper Motor</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStepperControl('START')}
                disabled={isAdvancedCommandLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> START
              </button>
              <button
                onClick={() => handleStepperControl('STOP')}
                disabled={isAdvancedCommandLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
              >
                <Square className="w-4 h-4" /> STOP
              </button>
              <button
                onClick={() => handleStepperControl('CW')}
                disabled={isAdvancedCommandLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
              >
                <RotateCw className="w-4 h-4" /> CW
              </button>
              <button
                onClick={() => handleStepperControl('CCW')}
                disabled={isAdvancedCommandLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> CCW
              </button>
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Power className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Auger / Conveyor</p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${relayStatus === 'ON' ? 'text-green-700' : 'text-gray-400'}`}>{relayStatus}</p>
              <div className="flex gap-2">
                <button onClick={() => handleRelayControl('ON')} disabled={isAdvancedCommandLoading} className="px-4 py-2 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">ON</button>
                <button onClick={() => handleRelayControl('OFF')} disabled={isAdvancedCommandLoading} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50">OFF</button>
              </div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Heater</p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${heaterStatus === 'ON' ? 'text-green-700' : 'text-gray-400'}`}>{heaterStatus}</p>
              <div className="flex gap-2">
                <button onClick={() => handleHeaterControl('ON')} disabled={isAdvancedCommandLoading} className="px-4 py-2 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">ON</button>
                <button onClick={() => handleHeaterControl('OFF')} disabled={isAdvancedCommandLoading} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50">OFF</button>
              </div>
            </div>
          </div>
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
            {predictions.slice(0, 10).map((p: { id: string; createdAt: string; isDryingComplete?: boolean; output?: { recommendation?: string; confidence?: number; estimatedMinutesToTarget?: number; predictedMoisture30min?: number; efficiencyScore?: number } }) => (
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
