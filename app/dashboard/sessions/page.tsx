'use client'

import { useState, useEffect } from 'react'
import { Play, Square, Clock, Droplets, Zap, ThermometerSun, Wheat, CheckCircle2, XCircle, Timer } from 'lucide-react'
import Card from '@/components/Card'
import { useDryingSessions, useStartDryingSession, useEndDryingSession, useDevices } from '@/hooks/useApi'
import { useEventStream } from '@/hooks/useEventStream'
import ErrorState from '@/components/ErrorState'
import { LoadingTable } from '@/components/LoadingTable'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceStatus, DryingSessionStatus } from '@/lib/enums'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    [DryingSessionStatus.Active]: 'bg-green-50 text-green-700 border-green-200',
    [DryingSessionStatus.Completed]: 'bg-blue-50 text-blue-700 border-blue-200',
    [DryingSessionStatus.Aborted]: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status === DryingSessionStatus.Active && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
      {status === DryingSessionStatus.Completed && <CheckCircle2 className="w-3 h-3" />}
      {status === DryingSessionStatus.Aborted && <XCircle className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showStartModal, setShowStartModal] = useState(false)
  const [newSession, setNewSession] = useState({ deviceId: '', grainType: 'rice', targetMoisture: 14 })
  const [liveSessions, setLiveSessions] = useState<Record<string, { currentMoisture: number }>>({})
  const pageSize = 10

  const { data: sessionsData, isLoading, error, refetch } = useDryingSessions({ status: statusFilter || undefined, page, limit: pageSize })
  const { data: activeSessionsData } = useDryingSessions({ status: DryingSessionStatus.Active })
  const { data: devices } = useDevices()
  const startSession = useStartDryingSession()
  const endSession = useEndDryingSession()
  const { subscribe, isConnected } = useEventStream()

  useEffect(() => {
    const unsub1 = subscribe('session_update', (data) => {
      setLiveSessions(prev => ({
        ...prev,
        [data.sessionId as string]: { currentMoisture: data.currentMoisture as number },
      }))
    })
    const unsub2 = subscribe('session_complete', () => {
      refetch()
    })
    return () => { unsub1(); unsub2() }
  }, [subscribe, refetch])

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  type Session = { _id: string; deviceId: string; grainType: string; status: string; startMoisture: number; currentMoisture: number; targetMoisture: number; avgTemperature?: number; totalEnergyUsed?: number; startedAt: string; duration?: number; efficiency?: number; finalMoisture?: number; isSimulated?: boolean }
  type SessionsResult = {
    data?: Session[]
    pagination?: {
      total: number
      count: number
      page: number
      limit: number
      totalPages: number
    }
  }
  const sessionsResult = sessionsData as SessionsResult | Session[] | undefined
  const sessions: Session[] = Array.isArray(sessionsResult) ? sessionsResult : sessionsResult?.data || []
  const pagination = !Array.isArray(sessionsResult) ? sessionsResult?.pagination : undefined
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const totalSessions = pagination?.total ?? sessions.length
  const startRow = totalSessions === 0 ? 0 : ((pagination?.page ?? page) - 1) * (pagination?.limit ?? pageSize) + 1
  const endRow = Math.min(totalSessions, startRow + sessions.length - 1)
  const activeSessions = sessions.filter((s) => s.status === DryingSessionStatus.Active)
  const allActiveSessions: Session[] = activeSessionsData?.data || activeSessions
  const onlineDevices = (devices as Array<{ deviceId: string; status: string }> | undefined)?.filter(d => d.status === DeviceStatus.Online) || []
  const simulatedSessionCount = sessions.filter(session => session.isSimulated).length

  const handleStart = async () => {
    if (!newSession.deviceId) return
    if (allActiveSessions.some(session => session.deviceId === newSession.deviceId)) {
      return
    }
    await startSession.mutateAsync(newSession)
    setShowStartModal(false)
    setNewSession({ deviceId: '', grainType: 'rice', targetMoisture: 14 })
  }

  const handleEnd = async (id: string, action: 'complete' | 'abort') => {
    await endSession.mutateAsync({ id, action })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
        <Card className="p-6">
          <LoadingTable rows={5} cols={8} />
        </Card>
      </div>
    )
  }

  if (error) {
    return <ErrorState message="Failed to load drying sessions." onRetry={refetch} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Drying Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage grain drying operations</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
            </span>
          )}
          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <Play className="w-4 h-4" /> Start Session
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeSessions.map((session) => {
              const live = liveSessions[session._id]
              const moisture = live?.currentMoisture ?? session.currentMoisture
              const progress = session.startMoisture > session.targetMoisture
                ? Math.min(100, Math.round(((session.startMoisture - moisture) / (session.startMoisture - session.targetMoisture)) * 100))
                : 0
              const elapsed = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)

              return (
                <Card key={session._id} className="p-5 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-green-700" />
                      <span className="font-semibold text-gray-900 text-sm">{session.deviceId}</span>
                    </div>
                    <StatusBadge status={DryingSessionStatus.Active} />
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Moisture</p>
                        <p className="text-sm font-semibold text-gray-900">{moisture?.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThermometerSun className="w-3.5 h-3.5 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500">Avg Temp</p>
                        <p className="text-sm font-semibold text-gray-900">{session.avgTemperature?.toFixed(1)}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-purple-500" />
                      <div>
                        <p className="text-xs text-gray-500">Elapsed</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDuration(elapsed)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-500" />
                      <div>
                        <p className="text-xs text-gray-500">Energy</p>
                        <p className="text-sm font-semibold text-gray-900">{session.totalEnergyUsed?.toFixed(1)} kWh</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Wheat className="w-3 h-3" />
                    <span>{session.grainType}</span>
                    <span className="text-gray-300">|</span>
                    <span>Target: {session.targetMoisture}%</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEnd(session._id, 'complete')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </button>
                    <button
                      onClick={() => handleEnd(session._id, 'abort')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" /> Abort
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-gray-200 pb-px">
        <div className="flex items-center gap-2">
          {['', DryingSessionStatus.Active, DryingSessionStatus.Completed, DryingSessionStatus.Aborted].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                statusFilter === status
                  ? 'text-green-800 border-b-2 border-green-800 bg-green-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        {simulatedSessionCount > 0 && (
          <div className="pb-2 text-xs font-semibold text-green-700">
            Showing {simulatedSessionCount} seeded historical run{simulatedSessionCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Sessions Table */}
      {!isLoading && !error && Array.isArray(sessions) && sessions.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Device</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Grain</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Moisture</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Efficiency</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Energy</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{session.deviceId}</span>
                      {session.isSimulated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 text-[11px] font-semibold">
                          Demo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 capitalize">{session.grainType}</td>
                  <td className="py-3 px-4"><StatusBadge status={session.status} /></td>
                  <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                    {session.startMoisture?.toFixed(1)}% → {(session.finalMoisture || session.currentMoisture)?.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                    {session.duration ? formatDuration(session.duration) : '—'}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {session.efficiency != null ? (
                      <span className={`font-medium ${session.efficiency >= 80 ? 'text-green-700' : session.efficiency >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                        {session.efficiency}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                    {session.totalEnergyUsed?.toFixed(1) || '0'} kWh
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Showing {startRow}-{endRow} of {totalSessions} sessions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : !isLoading && !error ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-green-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Start your first drying session to begin tracking.</p>
          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Play className="w-4 h-4" /> Start Session
          </button>
        </Card>
      ) : null}

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Start Drying Session</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
                <select
                  value={newSession.deviceId}
                  onChange={e => setNewSession(prev => ({ ...prev, deviceId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="">Select a device...</option>
                  {(devices as Array<{ deviceId: string; status: string }> || []).map((d) => (
                    <option
                      key={d.deviceId}
                      value={d.deviceId}
                      disabled={d.status !== DeviceStatus.Online || allActiveSessions.some(session => session.deviceId === d.deviceId)}
                    >
                      {d.deviceId} {d.status === DeviceStatus.Online ? '(Online)' : '(Offline)'}
                      {allActiveSessions.some(session => session.deviceId === d.deviceId) ? ' · Active session' : ''}
                    </option>
                  ))}
                </select>
                {onlineDevices.length === 0 && (
                  <p className="mt-2 text-xs text-red-600">No online prototypes available. Power on a device and wait for live sensor data before starting a session.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grain Type</label>
                <select
                  value={newSession.grainType}
                  onChange={e => setNewSession(prev => ({ ...prev, grainType: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="rice">Rice</option>
                  <option value="corn">Corn</option>
                  <option value="wheat">Wheat</option>
                  <option value="soybean">Soybean</option>
                  <option value="coffee">Coffee</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Moisture (%)</label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={newSession.targetMoisture}
                  onChange={e => setNewSession(prev => ({ ...prev, targetMoisture: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!newSession.deviceId || startSession.isPending || onlineDevices.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                {startSession.isPending ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
