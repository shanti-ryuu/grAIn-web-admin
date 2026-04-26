'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, X, MoreHorizontal, Shield, UserCheck, UserX, Trash2, Eye, Loader2 } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useDevices, useBulkDeleteUsers } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/lib/auth-store'
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

type PendingAction = {
  type: 'make_farmer' | 'make_admin' | 'deactivate' | 'activate' | 'delete' | 'bulk_delete'
  user?: UserRow
} | null

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isHydrated } = useAuthStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'farmer' })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  const { data: usersData, isLoading, error, refetch } = useUsers()
  const { data: devices } = useDevices()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const bulkDeleteUsers = useBulkDeleteUsers()

  const users = (usersData as any)?.users || []

  const deviceCounts: Record<string, number> = {}
  ;(devices || []).forEach((d: any) => {
    const uid = d.assignedUser?.id || d.assignedUser?._id || d.assignedUser
    if (uid) deviceCounts[uid] = (deviceCounts[uid] || 0) + 1
  })

  const tableData: UserRow[] = (users || []).map((u: any) => ({
    id: u._id?.toString?.() || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    deviceCount: deviceCounts[u._id?.toString?.() || u.id] || 0,
  }))

  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!addForm.name || addForm.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
    if (!addForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errors.email = 'Valid email is required'
    if (!addForm.password || addForm.password.length < 6) errors.password = 'Password must be at least 6 characters'
    setAddErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAddForm()) return
    try {
      await createUser.mutateAsync(addForm)
      toast({ title: 'User Created', description: `User ${addForm.name} created successfully` })
      setShowAddModal(false)
      setAddForm({ name: '', email: '', password: '', role: 'farmer' })
      setAddErrors({})
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to create user. Please try again.'
      toast({ title: 'Creation Failed', description: msg, variant: 'destructive' })
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already')) {
        setAddErrors(prev => ({ ...prev, email: msg }))
      }
    }
  }

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { type, user } = pendingAction

    try {
      if (type === 'make_farmer') {
        await updateUser.mutateAsync({ id: user!.id, role: 'farmer' })
        toast({ title: 'Role Updated', description: `${user!.name} is now a Farmer` })
      } else if (type === 'make_admin') {
        await updateUser.mutateAsync({ id: user!.id, role: 'admin' })
        toast({ title: 'Role Updated', description: `${user!.name} is now an Admin` })
      } else if (type === 'deactivate') {
        await updateUser.mutateAsync({ id: user!.id, status: 'inactive' })
        toast({ title: 'Account Deactivated', description: `${user!.name}'s account has been deactivated` })
      } else if (type === 'activate') {
        await updateUser.mutateAsync({ id: user!.id, status: 'active' })
        toast({ title: 'Account Activated', description: `${user!.name}'s account has been activated` })
      } else if (type === 'delete') {
        await deleteUser.mutateAsync(user!.id)
        toast({ title: 'User Deleted', description: `${user!.name} has been permanently deleted` })
      } else if (type === 'bulk_delete') {
        await bulkDeleteUsers.mutateAsync(selectedRows)
        setSelectedRows([])
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err?.response?.data?.error || err?.response?.data?.message || 'Failed to perform action',
        variant: 'destructive',
      })
    }
    setPendingAction(null)
  }

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return
    setPendingAction({ type: 'bulk_delete' })
  }

  const handleAddModalClose = (open: boolean) => {
    if (!open) {
      setAddForm({ name: '', email: '', password: '', role: 'farmer' })
      setAddErrors({})
    }
    setShowAddModal(open)
  }

  const getConfirmConfig = () => {
    if (!pendingAction) return { title: '', message: '', confirmText: 'Confirm', variant: 'danger' as const }
    const { type, user } = pendingAction
    switch (type) {
      case 'make_farmer':
        return {
          title: 'Change User Role',
          message: <span>Are you sure you want to change <strong>{user!.name}</strong>&apos;s role to Farmer? This will affect their access level.</span>,
          confirmText: 'Yes, Change Role',
          variant: 'warning' as const,
        }
      case 'make_admin':
        return {
          title: 'Change User Role',
          message: <span>Are you sure you want to change <strong>{user!.name}</strong>&apos;s role to Admin? They will gain full system control.</span>,
          confirmText: 'Yes, Change Role',
          variant: 'blue' as const,
        }
      case 'deactivate':
        return {
          title: 'Deactivate Account',
          message: <span>Are you sure you want to deactivate <strong>{user!.name}</strong>&apos;s account? They will lose access.</span>,
          confirmText: 'Yes, Deactivate',
          variant: 'danger' as const,
        }
      case 'activate':
        return {
          title: 'Activate Account',
          message: <span>Are you sure you want to activate <strong>{user!.name}</strong>&apos;s account? They will regain access.</span>,
          confirmText: 'Yes, Activate',
          variant: 'green' as const,
        }
      case 'delete':
        return {
          title: 'Delete User',
          message: (
            <span>
              This action cannot be undone. This will permanently delete <strong>{user!.name}</strong>&apos;s account and remove all associated data.
              {user!.deviceCount > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ This user has {user!.deviceCount} assigned device(s) that will be unassigned.
                </span>
              )}
            </span>
          ),
          confirmText: 'Delete',
          variant: 'danger' as const,
        }
      case 'bulk_delete':
        return {
          title: 'Delete Selected Users',
          message: <span>Are you sure you want to permanently delete <strong>{selectedRows.length}</strong> user(s)? This action cannot be undone.</span>,
          confirmText: 'Delete All',
          variant: 'danger' as const,
        }
      default:
        return { title: '', message: '', confirmText: 'Confirm', variant: 'danger' as const }
    }
  }

  const columns: ColumnDef<UserRow>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedRows.length === tableData.length && tableData.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRows(tableData.map(d => d.id))
            } else {
              setSelectedRows([])
            }
          }}
          className="w-4 h-4 rounded border-gray-300 text-green-800 focus:ring-green-800"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.includes(row.original.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRows(prev => [...prev, row.original.id])
            } else {
              setSelectedRows(prev => prev.filter(id => id !== row.original.id))
            }
          }}
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
          <span className={role === 'admin' ? 'badge-admin' : 'badge-farmer'}>
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
          <span className={status === 'active' ? 'badge-online' : 'badge-offline'}>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={4}
              avoidCollisions={true}
              collisionPadding={16}
            >
              <DropdownMenuItem onClick={() => setPendingAction({
                type: user.role === 'admin' ? 'make_farmer' : 'make_admin',
                user,
              })}>
                <Shield className="w-4 h-4" />
                {user.role === 'admin' ? 'Make Farmer' : 'Make Admin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPendingAction({
                type: user.status === 'active' ? 'deactivate' : 'activate',
                user,
              })}>
                {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                {user.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/devices?userId=${user.id}&userName=${encodeURIComponent(user.name)}`)}>
                <Eye className="w-4 h-4" />
                View Devices
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => setPendingAction({ type: 'delete', user })}
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ]

  if (!isHydrated || isLoading) {
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

  const confirmConfig = getConfirmConfig()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1><p className="text-base text-gray-500">Manage administrator and farmer accounts.</p></div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-white font-medium">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg">
          <span className="text-sm font-medium text-red-700">
            {selectedRows.length} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedRows([])}
            className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {tableData.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p className="text-sm text-gray-500">Add your first user to get started.</p>
        </Card>
      ) : (
        <>
          <DataTable columns={columns} data={tableData} searchPlaceholder="Search by name or email..." />
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => handleAddModalClose(false)}>
          <div className="dialog-content p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add User</h2>
              <button onClick={() => handleAddModalClose(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" value={addForm.name} onChange={(e) => { setAddForm({ ...addForm, name: e.target.value }); setAddErrors({ ...addErrors, name: '' }) }} required
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 ${addErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                {addErrors.name && <p className="mt-1 text-xs text-red-600">{addErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={addForm.email} onChange={(e) => { setAddForm({ ...addForm, email: e.target.value }); setAddErrors({ ...addErrors, email: '' }) }} required autoComplete="off"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 ${addErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                {addErrors.email && <p className="mt-1 text-xs text-red-600">{addErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={addForm.password} onChange={(e) => { setAddForm({ ...addForm, password: e.target.value }); setAddErrors({ ...addErrors, password: '' }) }} required minLength={6} autoComplete="new-password"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-800 ${addErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                {addErrors.password && <p className="mt-1 text-xs text-red-600">{addErrors.password}</p>}
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
                <button type="button" onClick={() => handleAddModalClose(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="btn-primary flex-1 px-4 py-2.5 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createUser.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for all actions */}
      <ConfirmModal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        loading={updateUser.isPending || deleteUser.isPending || bulkDeleteUsers.isPending}
      />
    </div>
  )
}
