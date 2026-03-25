'use client'

import { useRouter } from 'next/navigation'
import { Cpu, Activity, AlertTriangle, Clock } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import { useDevices, useAlerts, useAnalyticsOverview } from '@/hooks/useApi'
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
  const { data: alerts, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts()
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useAnalyticsOverview()

  const totalDevices = devices?.length || 0
  const activeDryers = devices?.filter((d: any) => d.status === 'online').length || 0
  const activeAlerts = alerts?.filter((a: any) => a.severity === 'critical').length || 0
  const avgDryingTime = analytics?.[0]?.temperature || '4.9h'

  if (devicesLoading || alertsLoading || analyticsLoading) {
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

  const chartData = analytics || []

  if (devicesError || alertsError || analyticsError) {
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
            refetchAlerts()
            refetchAnalytics()
          }}
        />
      </div>
    )
  }

  if (totalDevices === 0 && !devicesLoading && !alertsLoading && !analyticsLoading) {
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
          value={activeDryers.toString()}
          subtitle={`${Math.round((activeDryers / totalDevices) * 100) || 0}% online`}
          trend={{ value: 5, isPositive: true }}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts.toString()}
          subtitle={`${alerts?.filter((a: any) => a.severity === 'warning').length || 0} warnings`}
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
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Temperature Trend</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 24 hours</p>
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
                dataKey="temperature"
                stroke="#166534"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Moisture Chart */}
        <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6">
          <h3 className="text-lg font-semibold text-[#111827] mb-1">Moisture Levels</h3>
          <p className="text-sm text-[#6b7280] mb-6">Last 24 hours</p>
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
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6">
        <h3 className="text-lg font-semibold text-[#111827] mb-6">Recent Alerts</h3>
        <div className="space-y-3">
          {(alerts || []).slice(0, 5).map((alert: any) => {
            const severityConfig: any = {
              critical: {
                bgColor: '#fef2f2',
                textColor: '#dc2626',
                borderColor: '#fecaca',
                dotColor: '#dc2626',
              },
              warning: {
                bgColor: '#fffbeb',
                textColor: '#d97706',
                borderColor: '#fde68a',
                dotColor: '#d97706',
              },
              info: {
                bgColor: '#eff6ff',
                textColor: '#2563eb',
                borderColor: '#bfdbfe',
                dotColor: '#2563eb',
              },
            }

            const config = severityConfig[alert.severity] || severityConfig.info

            return (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-lg border transition-colors duration-200"
                style={{
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: config.dotColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827]">{alert.message}</p>
                  <p className="text-xs mt-1" style={{ color: config.textColor }}>
                    {alert.timestamp}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded text-xs font-medium whitespace-nowrap border"
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.textColor,
                    borderColor: config.dotColor,
                  }}
                >
                  {alert.severity}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
