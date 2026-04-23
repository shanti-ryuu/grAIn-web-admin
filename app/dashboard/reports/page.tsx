'use client'

import { useState } from 'react'
import Card from '@/components/Card'
import Table from '@/components/Table'
import MetricCard from '@/components/MetricCard'
import ErrorState from '@/components/ErrorState'
import { useToast } from '@/hooks/useToast'
import { useCommandHistory, useAnalyticsOverview, useDevices } from '@/hooks/useApi'
import { FileText, Activity, Zap, Cpu, Download } from 'lucide-react'

export default function ReportsPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: commands, isLoading: cmdLoading, error: cmdError, refetch } = useCommandHistory(undefined, 20)
  const { data: analytics } = useAnalyticsOverview('monthly')
  const { data: devices } = useDevices()

  const isLoading = cmdLoading
  const error = cmdError

  const totalCycles = analytics?.totalCycles || 0
  const avgMoisture = analytics?.moistureTrend?.length
    ? (analytics.moistureTrend.reduce((s: number, r: any) => s + r.value, 0) / analytics.moistureTrend.length).toFixed(1)
    : '--'
  const totalEnergy = analytics?.energyConsumption?.reduce((s: number, r: any) => s + r.value, 0).toFixed(1) || '--'
  const activeDevices = (devices || []).filter((d: any) => d.status === 'online').length

  const filteredCommands = (commands || []).filter((cmd: any) => {
    if (!dateFrom && !dateTo) return true
    const cmdDate = new Date(cmd.createdAt)
    if (dateFrom && cmdDate < new Date(dateFrom)) return false
    if (dateTo && cmdDate > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const handleExportCSV = () => {
    if (filteredCommands.length === 0) {
      toast({ title: 'No data', description: 'No commands to export.', variant: 'destructive' })
      return
    }
    const rows = ['DeviceID,Command,Mode,Status,Temperature,FanSpeed,Timestamp']
    filteredCommands.forEach((cmd: any) => {
      rows.push(`${cmd.deviceId},${cmd.command},${cmd.mode},${cmd.status},${cmd.temperature ?? ''},${cmd.fanSpeed ?? ''},${cmd.createdAt}`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Report exported', description: 'CSV downloaded successfully.' })
  }

  const commandColumns = [
    { key: 'deviceId', label: 'Device ID' },
    { key: 'command', label: 'Command' },
    { key: 'mode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${v === 'executed' ? 'bg-green-50 text-green-600' : v === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>{v}</span>
    )},
    { key: 'createdAt', label: 'Timestamp', render: (v: string) => new Date(v).toLocaleString() },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-32 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"><div className="h-6 bg-gray-200 rounded w-24 mb-4" /></div>)}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1><p className="text-base text-gray-500">Generate and download detailed reports.</p></div>
        <ErrorState message="Failed to load report data." onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1><p className="text-base text-gray-500">Generate and download detailed reports on drying operations.</p></div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Drying Cycles" value={totalCycles} subtitle="Last 30 days" icon={<Activity className="w-5 h-5" />} />
        <MetricCard title="Avg Moisture Achieved" value={`${avgMoisture}%`} subtitle="Target: 13-14%" icon={<Zap className="w-5 h-5" />} />
        <MetricCard title="Total Energy Used" value={`${totalEnergy} kWh`} subtitle="Last 30 days" icon={<Zap className="w-5 h-5" />} />
        <MetricCard title="Active Devices" value={activeDevices} subtitle="Currently online" icon={<Cpu className="w-5 h-5" />} />
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
        </div>
      </Card>

      {filteredCommands.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-800" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity</h3>
          <p className="text-sm text-gray-500">No commands recorded for the selected period.</p>
        </Card>
      ) : (
        <Table columns={commandColumns} data={filteredCommands} title="Recent Activity" />
      )}
    </div>
  )
}
