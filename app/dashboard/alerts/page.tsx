'use client'

import Card from '@/components/Card'
import ErrorState from '@/components/ErrorState'
import { useAlerts } from '@/hooks/useApi'

export default function AlertsPage() {
  const { data: alerts, isLoading, error, refetch } = useAlerts()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <Card className="p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Alert Log</h1>
          <p className="text-base text-[#6b7280]">
            View all system alerts and notifications in chronological order.
          </p>
        </div>
        <ErrorState
          message="Failed to load alerts. Please try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827] mb-2">Alert Log</h1>
        <p className="text-base text-[#6b7280]">
          View all system alerts and notifications in chronological order.
        </p>
      </div>

      {(alerts || []).length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">No Alerts</h3>
          <p className="text-sm text-[#6b7280]">
            All systems are operating normally. No alerts to display.
          </p>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="space-y-3">
            {(alerts || []).map((alert: any) => {
              const severityConfig: any = {
                critical: {
                  badge: 'bg-red-50 text-red-600 border-red-200',
                  dot: 'bg-red-500',
                },
                warning: {
                  badge: 'bg-yellow-50 text-yellow-600 border-yellow-200',
                  dot: 'bg-yellow-500',
                },
                info: {
                  badge: 'bg-blue-50 text-blue-600 border-blue-200',
                  dot: 'bg-blue-500',
                },
              }

              const config =
                severityConfig[alert.type as keyof typeof severityConfig] || severityConfig.info

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 p-4 border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors duration-200"
                >
                  {/* Severity Indicator */}
                  <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ${config.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] break-words">
                      {alert.message}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-1">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                  </div>

                  {/* Badge */}
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold border capitalize whitespace-nowrap ${config.badge}`}
                  >
                    {alert.type}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
