'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, Plus, X } from 'lucide-react'
import Table from '@/components/Table'
import Card from '@/components/Card'
import { useDevices, useUsers, useRegisterDevice } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import ErrorState from '@/components/ErrorState'

export default function DevicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({ deviceId: '', location: '', assignedUser: '' })

  const { data: devices, isLoading, error, refetch } = useDevices()
  const { data: users } = useUsers()
  const registerDevice = useRegisterDevice()

  const farmers = (users || []).filter((u: any) => u.role === 'farmer')

  const statusBadge = (status: string) => {
    const isOnline = status === 'online'
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredDevices = (devices || []).filter(
    (device: any) =>
      device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.assignedUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await registerDevice.mutateAsync(registerForm)
      toast({ title: 'Device registered', description: `Device ${registerForm.deviceId} registered successfully.` })
      setShowRegisterModal(false)
      setRegisterForm({ deviceId: '', location: '', assignedUser: '' })
    } catch {
      toast({ title: 'Registration failed', description: 'Failed to register device.', variant: 'destructive' })
    }
  }

  const handleViewDevice = (deviceId: string) => {
    router.push(`/dashboard/devices/${deviceId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <Card className="p-4 animate-pulse"><div className="h-10 bg-gray-200 rounded" /></Card>
        <Card className="p-6 animate-pulse"><div className="h-64 bg-gray-200 rounded" /></Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">All Devices</h1><p className="text-base text-gray-500">Monitor and manage all dryer devices.</p></div>
        <ErrorState message="Failed to load devices." onRetry={refetch} />
      </div>
    )
  }

  const columns = [
    { key: 'deviceId', label: 'Device ID' },
    { key: 'status', label: 'Status', render: (value: string) => statusBadge(value) },
    { key: 'location', label: 'Location' },
    { key: 'lastActive', label: 'Last Active', render: (value: any) => value ? new Date(value).toLocaleString() : 'Never' },
    { key: 'assignedUser', label: 'Assigned User', render: (value: any) => value?.name || 'Unassigned' },
    { key: 'actions', label: 'Actions', render: (_value: string, row: any) => (
      <button onClick={() => handleViewDevice(row.id)} className="text-green-800 text-sm font-semibold hover:text-green-700 transition-colors">View</button>
    )},
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">All Devices</h1><p className="text-base text-gray-500">Monitor and manage all dryer devices.</p></div>
        <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" /> Register Device
        </button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search devices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white" />
        </div>
      </Card>

      {filteredDevices.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-sm text-gray-500">Register your first device to get started.</p>
        </Card>
      ) : (
        <Table columns={columns} data={filteredDevices} title="Device List" />
      )}

      {/* Register Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Register New Device</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Device ID</label>
                <input type="text" value={registerForm.deviceId} onChange={(e) => setRegisterForm({ ...registerForm, deviceId: e.target.value.toUpperCase() })}
                  placeholder="e.g., GR-006" required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input type="text" value={registerForm.location} onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                  placeholder="e.g., Farm A, Plot 1" required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign User</label>
                <select value={registerForm.assignedUser} onChange={(e) => setRegisterForm({ ...registerForm, assignedUser: e.target.value })}
                  required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
                  <option value="">Select a farmer...</option>
                  {farmers.map((f: any) => (<option key={f.id} value={f.id}>{f.name} ({f.email})</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={registerDevice.isPending} className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {registerDevice.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
