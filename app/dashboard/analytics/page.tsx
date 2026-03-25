'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import ChartCard from '@/components/ChartCard'
import Card from '@/components/Card'
import { useAnalyticsOverview } from '@/hooks/useApi'
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

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d')
  const { data: analytics, isLoading, error, refetch } = useAnalyticsOverview()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <Card className="p-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded" />
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4" />
              <div className="h-64 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Analytics</h1>
          <p className="text-base text-[#6b7280]">
            View historical data and performance metrics of your devices.
          </p>
        </div>
        <ErrorState
          message="Failed to load analytics. Please try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  const chartData = analytics || []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827] mb-2">Analytics</h1>
        <p className="text-base text-[#6b7280]">
          View historical data and performance metrics of your devices.
        </p>
      </div>

      {/* Date Range Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-[#6b7280]" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-[#e5e7eb] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium bg-[#ffffff]"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </Card>

      {chartData.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">No Analytics Data</h3>
          <p className="text-sm text-[#6b7280]">
            No analytics data available for the selected time period.
          </p>
        </Card>
      ) : (
        <>
          {/* Historical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Temperature Trends */}
            <ChartCard
              title="Temperature Trends"
              description="Temperature measurements over time"
            >
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
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name="Temperature (°C)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Moisture Reduction */}
            <ChartCard
              title="Moisture Reduction"
              description="Grain moisture content over time"
            >
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
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name="Moisture (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Drying Duration Chart */}
          <ChartCard
            title="Drying Duration"
            description="Average drying time per device"
          >
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
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                  name="Duration (hours)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
