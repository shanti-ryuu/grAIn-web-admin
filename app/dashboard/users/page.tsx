'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, X, MoreHorizontal, Shield, UserCheck, UserX, Trash2, Eye, Loader2 } from 'lucide-react'
import Card from '@/components/Card'
import DataTable from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useDevices } from '@/hooks/useApi'
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

// FIX 2.2-2.5: Single pendingAction state handles all modal types
type PendingAction = {
  type: 'make_farmer' | 'make_admin' | 'deactivate' | 'activate' | 'delete'
  user: UserRow
} | null

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isHydrated } = useAuthStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'farmer' })
  // FIX 1: Inline validation errors for Add User form
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  // FIX 2.6: Server-side pagination state
  const [page, setPage] = useState(1)
  const limit = 10

  const { data: usersData, isLoading, error, refetch } = useUsers(page, limit)
  const { data: devices } = useDevices()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  // FIX 2.6: Unwrap paginated response
  const users = (usersData as any)?.data || []
  const pagination = (usersData as any)?.pagination || { total: 0, page: 1, totalPages: 1 }
  const totalPages = pagination.totalPages || 1
  const total = pagination.total || 0

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

  // FIX 1: Client-side validation before API call
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
      // Highlight email field if error mentions email/duplicate
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already')) {
        setAddErrors(prev => ({ ...prev, email: msg }))
      }
    }
  }

  // FIX 2.2: Confirmation modal for role changes
  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { type, user } = pendingAction

    try {
      if (type === 'make_farmer') {
        await updateUser.mutateAsync({ id: user.id, role: 'farmer' })
        toast({ title: 'Role Updated', description: `Role updated to Farmer successfully` })
      } else if (type === 'make_admin') {
        await updateUser.mutateAsync({ id: user.id, role: 'admin' })
        toast({ title: 'Role Updated', description: `Role updated to Admin successfully` })
      } else if (type === 'deactivate') {
        await updateUser.mutateAsync({ id: user.id, status: 'inactive' })
        toast({ title: 'Account Deactivated', description: `${user.name}'s account has been deactivated` })
      } else if (type === 'activate') {
        await updateUser.mutateAsync({ id: user.id, status: 'active' })
        toast({ title: 'Account Activated', description: `${user.name}'s account has been activated successfully` })
      } else if (type === 'delete') {
        await deleteUser.mutateAsync(user.id)
        toast({ title: 'User Deleted', description: `${user.name} has been permanently deleted` })
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err?.response?.data?.error || err?.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      })
    }
    setPendingAction(null)
  }

  // FIX 2.6: Pagination controls
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        // FIX 2.1: Use shadcn DropdownMenu with collisionPadding for auto-flip
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" collisionPadding={8}>
              {/* FIX 2.2: Make Farmer/Admin opens confirmation modal */}
              <DropdownMenuItem onClick={() => setPendingAction({
                type: user.role === 'admin' ? 'make_farmer' : 'make_admin',
                user,
              })}>
                <Shield className="w-4 h-4" />
                {user.role === 'admin' ? 'Make Farmer' : 'Make Admin'}
              </DropdownMenuItem>
              {/* FIX 2.3: Deactivate/Activate with dynamic label and icon */}
              <DropdownMenuItem onClick={() => setPendingAction({
                type: user.status === 'active' ? 'deactivate' : 'activate',
                user,
              })}>
                {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                {user.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              {/* FIX 2.4: View Devices navigates to filtered devices page */}
              <DropdownMenuItem onClick={() => router.push(`/dashboard/devices?userId=${user.id}&userName=${encodeURIComponent(user.name)}`)}>
                <Eye className="w-4 h-4" />
                View Devices
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* FIX 2.5: Delete User opens confirmation modal */}
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

  // FIX 2.6: Compute showing range
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1><p className="text-base text-gray-500">Manage administrator and farmer accounts.</p></div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {tableData.length === 0 && page === 1 ? (
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

          {/* FIX 2.6: Server-side pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing {start}-{end} of {total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                &lt;
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                &gt;
              </button>
            </div>
          </div>
        </>
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
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createUser.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIX 2.2-2.5: Unified confirmation modal for all actions */}
      <ConfirmModal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        title={
          pendingAction?.type === 'make_farmer' ? 'Change Role' :
          pendingAction?.type === 'make_admin' ? 'Change Role' :
          pendingAction?.type === 'deactivate' ? 'Deactivate Account' :
          pendingAction?.type === 'activate' ? 'Activate Account' :
          'Delete User'
        }
        message={
          pendingAction?.type === 'make_farmer' ? (
            <span>Are you sure you want to change <strong>{pendingAction.user.name}</strong>&apos;s role to Farmer? They will lose admin privileges.</span>
          ) : pendingAction?.type === 'make_admin' ? (
            <span>Are you sure you want to grant <strong>{pendingAction.user.name}</strong> admin access? They will have full system control.</span>
          ) : pendingAction?.type === 'deactivate' ? (
            <span>Are you sure you want to deactivate <strong>{pendingAction.user.name}</strong>&apos;s account? They will no longer be able to log in.</span>
          ) : pendingAction?.type === 'activate' ? (
            <span>Are you sure you want to reactivate <strong>{pendingAction.user.name}</strong>&apos;s account? They will regain access to the system.</span>
          ) : pendingAction?.type === 'delete' ? (
            <span>
              Are you sure you want to permanently delete <strong>{pendingAction.user.name}</strong> ({pendingAction.user.email})? This action cannot be undone.
              {pendingAction.user.deviceCount > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ This user has {pendingAction.user.deviceCount} assigned device(s). Deleting this account will unassign those devices.
                </span>
              )}
            </span>
          ) : ''
        }
        confirmText={
          pendingAction?.type === 'make_farmer' ? 'Yes, Change Role' :
          pendingAction?.type === 'make_admin' ? 'Yes, Grant Admin' :
          pendingAction?.type === 'deactivate' ? 'Deactivate' :
          pendingAction?.type === 'activate' ? 'Activate' :
          'Delete Permanently'
        }
        variant={
          pendingAction?.type === 'make_farmer' ? 'warning' :
          pendingAction?.type === 'make_admin' ? 'blue' :
          pendingAction?.type === 'deactivate' ? 'danger' :
          pendingAction?.type === 'activate' ? 'green' :
          'danger'
        }
        loading={updateUser.isPending || deleteUser.isPending}
      />
    </div>
  )
}
