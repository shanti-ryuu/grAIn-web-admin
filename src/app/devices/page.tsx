'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Table } from '@/components/dashboard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { deviceAPI, userAPI } from '@/lib/api/api';
import { Device, User } from '@/types';

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch devices and users
    const fetchData = async () => {
      try {
        const [devicesData, usersData] = await Promise.all([
          deviceAPI.getDevices(),
          userAPI.getUsers(),
        ]);

        setDevices(devicesData);
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleAssignDevice = async () => {
    if (!selectedDevice || !selectedUserId) return;

    try {
      await deviceAPI.assignDevice(selectedDevice.id, selectedUserId);
      setDevices(
        devices.map((d) =>
          d.id === selectedDevice.id ? { ...d, userId: selectedUserId } : d
        )
      );
      setShowAssignModal(false);
      setSelectedDevice(null);
      setSelectedUserId('');
    } catch (error) {
      console.error('Failed to assign device:', error);
    }
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || 'Unassigned';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading devices...</p>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Device Management</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-2">Monitor and manage all dryer units</p>
          </div>
          <Button variant="primary" size="sm">
            + Register Device
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Total Devices</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{devices.length}</p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Online</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {devices.filter((d) => d.status === 'online').length}
              </p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Offline</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600">
                {devices.filter((d) => d.status === 'offline').length}
              </p>
            </div>
          </Card>
        </div>

        {/* Devices Table - Responsive */}
        <div className="space-y-4 overflow-x-auto">
          {devices.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm md:text-base">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Device Name</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700 hidden sm:table-cell">Device ID</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Assigned To</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700 hidden lg:table-cell">Location</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-medium text-gray-900">{device.name}</div>
                        <div className="text-xs text-gray-600 sm:hidden">{device.deviceId}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-700 hidden sm:table-cell text-xs md:text-sm">{device.deviceId}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-700 hidden md:table-cell text-xs md:text-sm">{getUserName(device.userId)}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-700 hidden lg:table-cell text-xs md:text-sm">{device.location}</td>
                      <td className="px-4 md:px-6 py-4">
                        <Badge variant={device.status === 'online' ? 'success' : 'danger'}>
                          {device.status === 'online' ? '●' : '●'} <span className="ml-1 text-xs">{device.status}</span>
                        </Badge>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedDevice(device);
                            setSelectedUserId(device.userId);
                            setShowAssignModal(true);
                          }}
                        >
                          Assign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">No devices found</p>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Device Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedDevice(null);
          setSelectedUserId('');
        }}
        title={selectedDevice ? `Assign: ${selectedDevice.name}` : 'Assign Device'}
      >
        <div className="space-y-4">
          {selectedDevice && (
            <>
              <div>
                <p className="text-xs uppercase font-semibold text-gray-600 mb-2">Current Assignment</p>
                <p className="text-gray-900 text-sm">{getUserName(selectedDevice.userId)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Farmer
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select a farmer --</option>
                  {users
                    .filter((u) => u.role === 'farmer')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDevice(null);
                    setSelectedUserId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleAssignDevice}
                  disabled={!selectedUserId}
                >
                  Assign Device
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
