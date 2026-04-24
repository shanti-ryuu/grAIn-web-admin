'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, X, MoreHorizontal, Eye, MapPin, UserCircle, Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/ui/data-table'
import { useDevices, useUsers, useRegisterDevice, useDeleteDevice } from '@/hooks/useApi'
import ErrorState from '@/components/ErrorState'
import ConfirmModal from '@/components/ConfirmModal'

interface DeviceRow {
  id: string
  deviceId: string
  location: string
  assignedUser: string
  status: string
  lastActive: string
  moisture: string
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} mins ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function DevicesPage() {
  const router = useRouter()
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerForm, setRegisterForm] = useState({ deviceId: '', location: '', assignedUser: '' })
  const [deleteTarget, setDeleteTarget] = useState<DeviceRow | null>(null)
  const [actionOpen, setActionOpen] = useState<string | null>(null)

  const { data: devices, isLoading, error, refetch } = useDevices()
  const { data: allUsers } = useUsers()
  const registerDevice = useRegisterDevice()
  const deleteDevice = useDeleteDevice()

  const farmers = (allUsers || []).filter((u: any) => u.role === 'farmer')

  const tableData: DeviceRow[] = (devices || []).map((d: any) => ({
    id: d.id,
    deviceId: d.deviceId,
    location: d.location || '—',
    assignedUser: d.assignedUser?.name || 'Unassigned',
    status: d.status,
    lastActive: d.lastActive,
    moisture: '—',
  }))

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await registerDevice.mutateAsync(registerForm)
      setShowRegisterModal(false)
      setRegisterForm({ deviceId: '', location: '', assignedUser: '' })
    } catch {}
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDevice.mutateAsync(deleteTarget.id)
    } catch {}
    setDeleteTarget(null)
  }

  const columns: ColumnDef<DeviceRow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-green-800 focus:ring-green-800"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-green-800 focus:ring-green-800"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'deviceId',
      header: 'Device ID',
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'assignedUser',
      header: 'Assigned User',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'online' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
            {status === 'online' ? 'Online' : 'Offline'}
          </span>
        )
      },
    },
    {
      accessorKey: 'lastActive',
      header: 'Last Active',
      cell: ({ row }) => timeAgo(row.original.lastActive),
    },
    {
      accessorKey: 'moisture',
      header: 'Moisture',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const device = row.original
        return (
          <div className="relative">
            <button
              onClick={() => setActionOpen(actionOpen === device.id ? null : device.id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
            {actionOpen === device.id && (
              <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => { router.push(`/dashboard/devices/${device.id}`); setActionOpen(null) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => setActionOpen(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <MapPin className="w-4 h-4" /> Edit Location
                </button>
                <button
                  onClick={() => setActionOpen(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <UserCircle className="w-4 h-4" /> Reassign User
                </button>
                <button
                  onClick={() => { setDeleteTarget(device); setActionOpen(null) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Deregister Device
                </button>
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
  ]

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

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">All Devices</h1><p className="text-base text-gray-500">Monitor and manage all dryer devices.</p></div>
        <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" /> Register Device
        </button>
      </div>

      {tableData.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-sm text-gray-500">Register your first device to get started.</p>
        </Card>
      ) : (
        <DataTable columns={columns} data={tableData} searchPlaceholder="Search devices..." />
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

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Deregister Device"
          message={`Are you sure you want to deregister ${deleteTarget.deviceId}? This action cannot be undone.`}
          confirmText="Deregister"
          variant="danger"
        />
      )}
    </div>
  )
}
