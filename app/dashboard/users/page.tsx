'use client'

import Table from '@/components/Table'
import { useUsers } from '@/hooks/useApi'
import ErrorState from '@/components/ErrorState'

export default function UsersPage() {
  const { data: users, isLoading, error, refetch } = useUsers()

  const statusBadge = (status: string) => {
    const isActive = status === 'active'
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
          isActive
            ? 'bg-green-50 text-green-600'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {status}
      </span>
    )
  }

  const roleBadge = (role: string) => {
    const isAdmin = role === 'admin'
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
          isAdmin
            ? 'bg-purple-50 text-purple-600'
            : 'bg-blue-50 text-blue-600'
        }`}
      >
        {role}
      </span>
    )
  }

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => roleBadge(value),
    },
    { key: 'email', label: 'Email' },
    { key: 'lastActive', label: 'Last Active' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => statusBadge(value),
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] mb-2">User Management</h1>
          <p className="text-base text-[#6b7280]">
            Manage administrator and farmer accounts in the system.
          </p>
        </div>
        <ErrorState
          message="Failed to load users. Please try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827] mb-2">User Management</h1>
        <p className="text-base text-[#6b7280]">
          Manage administrator and farmer accounts in the system.
        </p>
      </div>

      {(users || []).length === 0 ? (
        <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-12 text-center">
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">No Users Found</h3>
          <p className="text-sm text-[#6b7280]">
            There are no users in the system yet. Add your first user to get started.
          </p>
        </div>
      ) : (
        <Table columns={columns} data={users || []} title="All Users" />
      )}
    </div>
  )
}
