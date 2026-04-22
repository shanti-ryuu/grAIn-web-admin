'use client'

import { useRouter } from 'next/navigation'
import { Cpu, Activity, AlertTriangle, Clock } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import { useDevices, useAnalyticsOverview } from '@/hooks/useApi'
import ErrorState from '@/components/ErrorState'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const { data: devices, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useDevices()
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useAnalyticsOverview()

  const totalDevices = devices?.length || 0
  const onlineDevices = devices?.filter((d: any) => d.status === 'online').length || 0
  const activeAlerts = 0 // TODO: Implement alerts count from useAlerts
  const dryingCycles = analyticsData?.dryingCycles || []
  const avgDryingTime = dryingCycles.length > 0
    ? `${(dryingCycles.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) / dryingCycles.length).toFixed(1)}h`
    : '0h'

  if (devicesLoading || analyticsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-10 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const moistureTrend = analyticsData?.moistureTrend || []

  // Transform moisture trend data for charts
  const chartData = moistureTrend.map((item: any) => ({
    time: item.time,
    moisture: item.value,
  }))

  if (devicesError || analyticsError) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Dashboard</h1>
          <p className="text-base text-[#6b7280]">
            Welcome to the grAIn Admin Dashboard.
          </p>
        </div>
        <ErrorState
          message="Failed to load dashboard data. Please try again."
          onRetry={() => {
            refetchDevices()
            refetchAnalytics()
          }}
        />
      </div>
    )
  }

  if (totalDevices === 0 && !devicesLoading && !analyticsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Dashboard</h1>
          <p className="text-base text-[#6b7280]">
            Welcome to the grAIn Admin Dashboard. Get started by registering your first device.
          </p>
        </div>
        <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-12 text-center">
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">No Devices Yet</h3>
          <p className="text-sm text-[#6b7280] mb-6">
            Register your first device to start monitoring your rice grain drying system.
          </p>
          <button
            onClick={() => router.push('/dashboard/devices')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] transition-colors"
          >
            <Cpu className="w-4 h-4" />
            Register Device
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Devices"
          value={totalDevices.toString()}
          subtitle="Active devices"
          trend={{ value: 2, isPositive: true }}
          icon={<Cpu className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Dryers"
          value={onlineDevices.toString()}
          subtitle={`${Math.round((onlineDevices / totalDevices) * 100) || 0}% online`}
          trend={{ value: 5, isPositive: true }}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts.toString()}
          subtitle="System alerts"
          trend={{ value: 1, isPositive: false }}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <MetricCard
          title="Avg Drying Time"
          value={avgDryingTime}
          subtitle="Last 24h average"
          trend={{ value: 2, isPositive: true }}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Chart */}
        <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6">
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Moisture Trend</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 24 hours (hourly avg)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#166534"
                strokeWidth={2}
                dot={false}
                name="Moisture (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Energy Consumption Chart */}
        <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6">
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Energy Consumption</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 7 days (daily total)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={(analyticsData?.energyConsumption || []).map((item: any) => ({
              time: item.day,
              energy: item.value,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Energy (kWh)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
