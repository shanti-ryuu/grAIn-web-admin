'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Table } from '@/components/dashboard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { userAPI } from '@/lib/api/api';
import { User } from '@/types';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch users
    const fetchUsers = async () => {
      try {
        const usersData = await userAPI.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await userAPI.updateUser(userId, { status: newStatus });

      setUsers(users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userAPI.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading users...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-2">Manage farmers and system administrators</p>
          </div>
          <Button variant="primary" size="sm">
            + Add New User
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Total Users</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Active Users</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {users.filter((u) => u.status === 'active').length}
              </p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Inactive Users</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">
                {users.filter((u) => u.status === 'inactive').length}
              </p>
            </div>
          </Card>
        </div>

        {/* Users Table - Responsive */}
        <div className="space-y-4 overflow-x-auto">
          {users.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm md:text-base">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Email</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Role</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-600 sm:hidden">{user.email}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-700 hidden sm:table-cell text-xs md:text-sm">{user.email}</td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell"><Badge variant="info">{user.role}</Badge></td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(user)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant={user.status === 'active' ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(user.id, user.status)}
                          >
                            {user.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">No users found</p>
            </Card>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser?.name || 'User Details'}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase font-semibold text-gray-600">Email</p>
              <p className="text-gray-900 text-sm">{selectedUser.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-gray-600">Role</p>
              <p className="text-gray-900 text-sm capitalize">{selectedUser.role}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-gray-600">Status</p>
              <Badge variant={selectedUser.status === 'active' ? 'success' : 'danger'}>
                {selectedUser.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-gray-600">Joined</p>
              <p className="text-gray-900 text-sm">{selectedUser.createdAt.toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDeleteUser(selectedUser.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
