'use client'

import { useState, useMemo } from 'react'
import { Trash2, CheckCircle } from 'lucide-react'
import Card from '@/components/Card'
import ErrorState from '@/components/ErrorState'
import { useAlerts, useMarkAlertRead, useClearAllAlerts } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'

export default function AlertsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('all')
  const { data: alerts, isLoading, error, refetch } = useAlerts()
  const markRead = useMarkAlertRead()
  const clearAll = useClearAllAlerts()

  const handleMarkRead = async (alertId: string) => {
    try {
      await markRead.mutateAsync(alertId)
      toast({ title: 'Alert Read', description: 'Alert marked as read' })
    } catch {
      toast({ title: 'Failed', description: 'Could not mark alert as read', variant: 'destructive' })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAll.mutateAsync()
      toast({ title: 'Alerts Cleared', description: 'All alerts have been dismissed' })
    } catch {
      toast({ title: 'Failed', description: 'Could not clear alerts', variant: 'destructive' })
    }
  }

  const allAlerts = alerts || []

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'all') return allAlerts
    return allAlerts.filter((a: any) => a.type === activeTab)
  }, [allAlerts, activeTab])

  const severityConfig: Record<string, { badge: string; dot: string }> = {
    critical: { badge: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
    warning: { badge: 'bg-yellow-50 text-yellow-600 border-yellow-200', dot: 'bg-yellow-500' },
    info: { badge: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-32 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <Card className="p-8 space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />))}</Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Alert Log</h1><p className="text-base text-gray-500">View all system alerts and notifications.</p></div>
        <ErrorState message="Failed to load alerts." onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">Alert Log</h1><p className="text-base text-gray-500">View all system alerts and notifications.</p></div>
        {allAlerts.length > 0 && (
          <button onClick={handleClearAll} disabled={clearAll.isPending}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      <Card className="p-4 flex gap-3 no-print">
        {['all', 'critical', 'warning', 'info'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t ? 'bg-green-800 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </Card>

      {filteredAlerts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts</h3>
          <p className="text-sm text-gray-500">All systems are operating normally.</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-3">
            {filteredAlerts.map((alert: any) => {
              const config = severityConfig[alert.type] || severityConfig.info
              return (
                <div key={alert.id} className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${alert.isRead ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm break-words ${alert.isRead ? 'text-gray-400' : 'font-medium text-gray-900'}`}>{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                      {alert.deviceId && <span className="text-xs text-gray-400">Device: {alert.deviceId}</span>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold border capitalize whitespace-nowrap ${config.badge}`}>{alert.type}</span>
                  {!alert.isRead && (
                    <button onClick={() => handleMarkRead(alert.id)} className="text-gray-400 hover:text-green-600 transition-colors" title="Mark as read">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
