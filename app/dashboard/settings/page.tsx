'use client'

import { useState } from 'react'
import Card from '@/components/Card'
import { useToast } from '@/hooks/useToast'

export default function SettingsPage() {
  const { toast } = useToast()

  // System Settings
  const [autoBackup, setAutoBackup] = useState(true)
  const [dataRetention, setDataRetention] = useState(365)
  const [theme, setTheme] = useState('light')

  // Notification Settings
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState('critical')

  // Data Management
  const [isExporting, setIsExporting] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: 'Export successful',
        description: 'System data has been exported successfully.',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export system data.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast({
        title: 'Cache cleared',
        description: 'System cache has been cleared successfully.',
      })
    } catch (error) {
      toast({
        title: 'Failed to clear cache',
        description: 'An error occurred while clearing the cache.',
        variant: 'destructive',
      })
    } finally {
      setIsClearingCache(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827] mb-2">Settings</h1>
        <p className="text-base text-[#6b7280]">
          Configure system preferences and manage your dashboard.
        </p>
      </div>

      {/* System Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-6">System Settings</h2>
        <div className="space-y-6">
          {/* Auto Backup Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-[#111827]">Auto Backup</label>
              <p className="text-xs text-[#6b7280] mt-1">Automatically backup data every 24 hours</p>
            </div>
            <button
              onClick={() => setAutoBackup(!autoBackup)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                autoBackup ? 'bg-[#166534]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  autoBackup ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Data Retention Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#111827]">Data Retention Period</label>
              <span className="text-sm text-[#166534] font-semibold">{dataRetention} days</span>
            </div>
            <input
              type="range"
              min="30"
              max="730"
              value={dataRetention}
              onChange={(e) => setDataRetention(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#166534]"
            />
            <p className="text-xs text-[#6b7280] mt-1">Data older than this period will be automatically deleted</p>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="text-sm font-medium text-[#111827] block mb-2">Interface Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-6">Notification Settings</h2>
        <div className="space-y-6">
          {/* Email Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-[#111827]">Email Alerts</label>
              <p className="text-xs text-[#6b7280] mt-1">Receive alerts via email</p>
            </div>
            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                emailAlerts ? 'bg-[#166534]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  emailAlerts ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* SMS Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-[#111827]">SMS Alerts</label>
              <p className="text-xs text-[#6b7280] mt-1">Receive critical alerts via SMS</p>
            </div>
            <button
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                smsAlerts ? 'bg-[#166534]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  smsAlerts ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Alert Threshold Dropdown */}
          <div>
            <label className="text-sm font-medium text-[#111827] block mb-2">Alert Threshold</label>
            <select
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-white"
            >
              <option value="all">All Alerts</option>
              <option value="warning">Warning and Critical</option>
              <option value="critical">Critical Only</option>
            </select>
            <p className="text-xs text-[#6b7280] mt-1">Minimum severity level for notifications</p>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-6">Data Management</h2>
        <div className="space-y-4">
          {/* Export Data Button */}
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>

          {/* Clear Cache Button */}
          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="w-full sm:w-auto px-6 py-2.5 border border-[#e5e7eb] text-[#111827] rounded-lg font-medium hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isClearingCache ? 'Clearing...' : 'Clear Cache'}
          </button>

          <p className="text-xs text-[#6b7280] mt-4">
            Export data to download system information. Clear cache to remove temporary files.
          </p>
        </div>
      </Card>
    </div>
  )
}
