'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, Filter, Plus, X } from 'lucide-react'
import Table from '@/components/Table'
import Card from '@/components/Card'
import { useDevices, useRegisterDevice } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import ErrorState from '@/components/ErrorState'

export default function DevicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  
  // Register Device Form State
  const [registerForm, setRegisterForm] = useState({
    deviceId: '',
    location: '',
    assignedUser: '',
  })
  
  // Assign Device Form State
  const [assignForm, setAssignForm] = useState({
    userId: '',
  })
  
  const { data: devices, isLoading, error, refetch } = useDevices()
  const registerDevice = useRegisterDevice()

  const statusBadge = (status: string) => {
    const isOnline = status === 'online'
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isOnline
            ? 'bg-green-50 text-green-600'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
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
      toast({
        title: 'Device registered',
        description: `Device ${registerForm.deviceId} has been registered successfully.`,
      })
      setShowRegisterModal(false)
      setRegisterForm({ deviceId: '', location: '', assignedUser: '' })
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Failed to register device. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: 'Device assigned',
        description: `Device ${selectedDeviceId} has been assigned to user ${assignForm.userId}.`,
      })
      setShowAssignModal(false)
      setAssignForm({ userId: '' })
      setSelectedDeviceId('')
    } catch (error) {
      toast({
        title: 'Assignment failed',
        description: 'Failed to assign device. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleViewDevice = (deviceId: string) => {
    router.push(`/dashboard/devices/${deviceId}`)
  }

  const handleOpenAssignModal = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setShowAssignModal(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <Card className="p-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded" />
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">All Devices</h1>
          <p className="text-base text-[#6b7280]">
            Monitor and manage all active dryer devices in the system.
          </p>
        </div>
        <ErrorState
          message="Failed to load devices. Please try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  const columns = [
    { key: 'deviceId', label: 'Device ID' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => statusBadge(value),
    },
    { key: 'location', label: 'Location' },
    {
      key: 'lastActive',
      label: 'Last Active',
      render: (value: Date) => new Date(value).toLocaleString(),
    },
    {
      key: 'assignedUser',
      label: 'Assigned User',
      render: (value: any) => value?.name || 'Unassigned',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value: string, row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDevice(row.id)}
            className="text-[#166534] text-sm font-semibold hover:text-[#15803d] transition-colors"
          >
            View
          </button>
          <span className="text-[#e5e7eb]">|</span>
          <button
            onClick={() => handleOpenAssignModal(row.id)}
            className="text-[#6b7280] text-sm font-semibold hover:text-[#111827] transition-colors"
          >
            Assign
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">All Devices</h1>
          <p className="text-base text-[#6b7280]">
            Monitor and manage all active dryer devices in the system.
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-[#ffffff]"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#111827] hover:bg-[#f9fafb] transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </Card>

      {/* Devices Table */}
      <Table columns={columns} data={filteredDevices} title="Device List" />

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-[#6b7280]">No devices found</p>
        </Card>
      )}

      {/* Register Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#111827]">Register New Device</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-[#6b7280] hover:text-[#111827] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={registerForm.deviceId}
                  onChange={(e) => setRegisterForm({ ...registerForm, deviceId: e.target.value })}
                  placeholder="e.g., DRY-001"
                  required
                  className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-[#ffffff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={registerForm.location}
                  onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                  placeholder="e.g., Warehouse A"
                  required
                  className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-[#ffffff]"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e5e7eb] text-[#111827] rounded-lg font-medium hover:bg-[#f9fafb] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerDevice.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {registerDevice.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Device Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#111827]">Assign Device</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-[#6b7280] hover:text-[#111827] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={selectedDeviceId}
                  disabled
                  className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm bg-gray-50 text-[#6b7280]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  User ID / Email
                </label>
                <input
                  type="text"
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  placeholder="e.g., user@example.com"
                  required
                  className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#166534] bg-[#ffffff]"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e5e7eb] text-[#111827] rounded-lg font-medium hover:bg-[#f9fafb] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] transition-colors"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
