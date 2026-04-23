'use client'

import { useState } from 'react'
import Card from '@/components/Card'
import ChartCard from '@/components/ChartCard'
import MetricCard from '@/components/MetricCard'
import ErrorState from '@/components/ErrorState'
import { useAnalyticsOverview, useDevices } from '@/hooks/useApi'
import { Thermometer, Droplets, Zap, Activity, Download, FileText } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const PIE_COLORS = ['#166534', '#6b7280', '#22c55e']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('weekly')
  const [deviceId, setDeviceId] = useState('all')
  const { data: analytics, isLoading, error, refetch } = useAnalyticsOverview(period, deviceId)
  const { data: devices } = useDevices()

  const handleExportCSV = () => {
    if (!analytics) return
    const rows: string[] = ['Type,Time/Label,Value']
    analytics.moistureTrend?.forEach((r: any) => rows.push(`Moisture,${r.time},${r.value}`))
    analytics.energyConsumption?.forEach((r: any) => rows.push(`Energy,${r.day},${r.value}`))
    analytics.dryingCycles?.forEach((r: any) => rows.push(`Cycle,${r.cycle},${r.duration}`))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `analytics-${period}-${deviceId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => { window.print() }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-32 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (<div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"><div className="h-6 bg-gray-200 rounded w-24 mb-4" /><div className="h-10 bg-gray-200 rounded w-16 mb-2" /></div>))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1><p className="text-base text-gray-500">Insights and trends across all dryer operations.</p></div>
        <ErrorState message="Failed to load analytics." onRetry={refetch} />
      </div>
    )
  }

  const { moistureTrend = [], dryingCycles = [], energyConsumption = [], avgTemperature = 0, avgHumidity = 0, totalCycles = 0, activeDryers = 0, deviceStatusDistribution = [] } = analytics || {}

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1><p className="text-base text-gray-500">Insights and trends across all dryer operations.</p></div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-green-800 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Device:</span>
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
            <option value="all">All Devices</option>
            {(devices || []).map((d: any) => (<option key={d.deviceId} value={d.deviceId}>{d.deviceId}</option>))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Avg Temperature" value={`${avgTemperature}°C`} subtitle="Across all devices" icon={<Thermometer className="w-5 h-5" />} />
        <MetricCard title="Avg Humidity" value={`${avgHumidity}%`} subtitle="Across all devices" icon={<Droplets className="w-5 h-5" />} />
        <MetricCard title="Total Cycles" value={totalCycles} subtitle="Drying cycles completed" icon={<Activity className="w-5 h-5" />} />
        <MetricCard title="Active Dryers" value={activeDryers} subtitle="Currently running" icon={<Zap className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Moisture Levels" description="Average moisture over time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={moistureTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="value" stroke="#166534" strokeWidth={2} dot={false} name="Moisture (%)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Drying Cycle Duration" description="Duration of recent cycles">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dryingCycles}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="cycle" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="duration" fill="#166534" radius={[4, 4, 0, 0]} name="Duration (min)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Energy Consumption" description="Energy usage over time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={energyConsumption}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="value" stroke="#166534" fill="#f0fdf4" strokeWidth={2} name="Energy (kWh)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Device Status Distribution" description="Online vs Offline devices">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={deviceStatusDistribution.length > 0 ? deviceStatusDistribution : [{ status: 'No data', count: 1 }]} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                {(deviceStatusDistribution.length > 0 ? deviceStatusDistribution : [{ status: 'No data', count: 1 }]).map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
