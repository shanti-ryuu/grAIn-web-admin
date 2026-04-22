'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Play, Pause, Thermometer, Droplets, Activity, Clock } from 'lucide-react'
import Card from '@/components/Card'
import { useDevice, useSensorData, useStartDryer, useStopDryer } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const deviceId = params.id as string

  const { data: device, isLoading: deviceLoading, error: deviceError } = useDevice(deviceId)
  const { data: sensorData, isLoading: sensorLoading } = useSensorData(device?.deviceId || '')
  const startDryer = useStartDryer()
  const stopDryer = useStopDryer()

  const [isRunning, setIsRunning] = useState(device?.status === 'online')

  const handleToggleDevice = async () => {
    try {
      // Use device.deviceId (e.g. "GR-001") for dryer commands, not the MongoDB _id
      const commandDeviceId = device?.deviceId || deviceId
      if (isRunning) {
        await stopDryer.mutateAsync(commandDeviceId)
        toast({
          title: 'Device stopped',
          description: `Device ${commandDeviceId} has been stopped.`,
        })
      } else {
        await startDryer.mutateAsync(commandDeviceId)
        toast({
          title: 'Device started',
          description: `Device ${commandDeviceId} has been started.`,
        })
      }
      setIsRunning(!isRunning)
    } catch (error) {
      toast({
        title: 'Command failed',
        description: 'Failed to send command to device.',
        variant: 'destructive',
      })
    }
  }

  if (deviceLoading || sensorLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 animate-pulse">
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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </button>
        <Card className="p-12 text-center">
          <p className="text-red-600">Failed to load device details. Please try again later.</p>
        </Card>
      </div>
    )
  }

  const chartData = (sensorData || []).map((data: any) => ({
    time: new Date(data.timestamp).toLocaleTimeString(),
    temperature: data.temperature,
    moisture: data.moisture,
    humidity: data.humidity,
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111827] mb-2">{device?.deviceId || 'Device Details'}</h1>
            <p className="text-base text-[#6b7280]">
              {device?.location || 'Unknown Location'} • Assigned to {device?.assignedUser?.name || 'Unassigned'}
            </p>
          </div>
          <button
            onClick={handleToggleDevice}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
              isRunning
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-[#166534] text-white hover:bg-[#15803d]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full ${
                device?.status === 'online' ? 'bg-[#22c55e]' : 'bg-gray-400'
              }`}
            />
            <div>
              <p className="text-sm font-medium text-[#111827]">Device Status</p>
              <p className="text-xs text-[#6b7280]">
                {device?.status === 'online' ? 'Online and Operational' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#111827]">Last Active</p>
            <p className="text-xs text-[#6b7280]">{device?.lastActive ? new Date(device.lastActive).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      </Card>

      {/* Sensor Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Thermometer className="w-5 h-5 text-[#166534]" />
            <p className="text-sm text-[#6b7280]">Temperature</p>
          </div>
          <p className="text-3xl font-bold text-[#111827]">42°C</p>
          <p className="text-xs text-[#6b7280] mt-1">Optimal range</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="w-5 h-5 text-[#166534]" />
            <p className="text-sm text-[#6b7280]">Moisture</p>
          </div>
          <p className="text-3xl font-bold text-[#111827]">13.5%</p>
          <p className="text-xs text-[#6b7280] mt-1">Target: 13-14%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-[#166534]" />
            <p className="text-sm text-[#6b7280]">Drying Progress</p>
          </div>
          <p className="text-3xl font-bold text-[#111827]">78%</p>
          <p className="text-xs text-[#6b7280] mt-1">Almost complete</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#166534]" />
            <p className="text-sm text-[#6b7280]">Time Remaining</p>
          </div>
          <p className="text-3xl font-bold text-[#111827]">1.2h</p>
          <p className="text-xs text-[#6b7280] mt-1">Estimated</p>
        </Card>
      </div>

      {/* Sensor Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Temperature History</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 24 hours</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#166534"
                strokeWidth={2}
                dot={false}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Moisture Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Moisture History</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 24 hours</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Moisture (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
