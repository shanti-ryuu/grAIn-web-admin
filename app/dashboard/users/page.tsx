'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, X, MoreHorizontal, Shield, UserCheck, Trash2, Eye } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/ui/data-table'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useDevices } from '@/hooks/useApi'
import ErrorState from '@/components/ErrorState'
import ConfirmModal from '@/components/ConfirmModal'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  deviceCount: number
}

export default function UsersPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'farmer' })
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [actionOpen, setActionOpen] = useState<string | null>(null)

  const { data: users, isLoading, error, refetch } = useUsers()
  const { data: devices } = useDevices()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const deviceCounts: Record<string, number> = {}
  ;(devices || []).forEach((d: any) => {
    const uid = d.assignedUser?.id || d.assignedUser?._id || d.assignedUser
    if (uid) deviceCounts[uid] = (deviceCounts[uid] || 0) + 1
  })

  const tableData: UserRow[] = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    deviceCount: deviceCounts[u.id] || 0,
  }))

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser.mutateAsync(addForm)
      setShowAddModal(false)
      setAddForm({ name: '', email: '', password: '', role: 'farmer' })
    } catch {}
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUser.mutateAsync({ id: userId, role: newRole })
    } catch {}
    setActionOpen(null)
  }

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await updateUser.mutateAsync({ id: userId, status: newStatus })
    } catch {}
    setActionOpen(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteUser.mutateAsync(deleteTarget.id)
    } catch {}
    setDeleteTarget(null)
  }

  const columns: ColumnDef<UserRow>[] = [
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
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
            {role === 'admin' ? 'Admin' : 'Farmer'}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
            {status === 'active' ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => {
        const val = row.original.createdAt
        return val ? new Date(val).toLocaleDateString() : '--'
      },
    },
    {
      accessorKey: 'deviceCount',
      header: 'Devices',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="relative">
            <button
              onClick={() => setActionOpen(actionOpen === user.id ? null : user.id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
            {actionOpen === user.id && (
              <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'farmer' : 'admin')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Shield className="w-4 h-4" />
                  {user.role === 'admin' ? 'Make Farmer' : 'Make Admin'}
                </button>
                <button
                  onClick={() => handleToggleStatus(user.id, user.status)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {user.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => { setActionOpen(null) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View Devices
                </button>
                <button
                  onClick={() => { setDeleteTarget(user); setActionOpen(null) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
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
        <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-64 mb-2" /><div className="h-4 bg-gray-200 rounded w-96" /></div>
        <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1><p className="text-base text-gray-500">Manage administrator and farmer accounts.</p></div>
        <ErrorState message="Failed to load users." onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1><p className="text-base text-gray-500">Manage administrator and farmer accounts.</p></div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {tableData.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p className="text-sm text-gray-500">Add your first user to get started.</p>
        </Card>
      ) : (
        <DataTable columns={columns} data={tableData} searchPlaceholder="Search by name or email..." />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 bg-white">
                  <option value="farmer">Farmer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {createUser.isPending ? 'Creating...' : 'Create'}
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
          title="Delete User"
          message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  )
}
