'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { MetricCard } from '@/components/dashboard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { deviceStatusAPI, deviceAPI } from '@/lib/api/api';
import { Device, DeviceStatus } from '@/types';
import { CheckIcon, AlertIcon } from '@/components/icons';

export default function MonitoringPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusData, setStatusData] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch data
    const fetchData = async () => {
      try {
        const [devicesData, statusesData] = await Promise.all([
          deviceAPI.getDevices(),
          deviceStatusAPI.getAllDeviceStatus(),
        ]);

        setDevices(devicesData);
        setStatusData(statusesData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up auto-refresh
    const intervalId = autoRefresh ? setInterval(fetchData, 5000) : undefined;

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [router, autoRefresh]);

  const getStatusBadgeVariant = (state: string): 'success' | 'warning' | 'danger' | 'default' => {
    if (state === 'drying') return 'success';
    if (state === 'idle') return 'warning';
    if (state === 'error') return 'danger';
    return 'default';
  };

  const getDeviceStatus = (deviceId: string) => {
    return statusData.find((s) => s.deviceId === deviceId);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading monitoring data...</p>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Real-time Monitoring</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="whitespace-nowrap"
          >
            {autoRefresh ? '⏸ Refresh On' : '▶ Refresh Off'}
          </Button>
        </div>

        {/* Device Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {devices.map((device) => {
            const status = getDeviceStatus(device.id);

            return (
              <Card key={device.id} variant="bordered" className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">{device.name}</h3>
                    <p className="text-xs md:text-sm text-gray-600">{device.deviceId}</p>
                  </div>
                  <Badge
                    variant={device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'}
                  >
                    {device.status === 'online' ? '●' : '●'} <span className="ml-1 text-xs">{device.status}</span>
                  </Badge>
                </div>

                {status && (
                  <>
                    {/* Device State */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <Badge variant={getStatusBadgeVariant(status.state)}>
                        {status.state.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Sensor Readings */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Temp</p>
                        <p className="text-lg md:text-xl font-bold text-orange-600">
                          {status.temperature.toFixed(1)}°
                        </p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Humidity</p>
                        <p className="text-lg md:text-xl font-bold text-blue-600">
                          {status.humidity.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Moisture</p>
                        <p className="text-lg md:text-xl font-bold text-green-600">
                          {status.moisture.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="py-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">Location</p>
                      <p className="text-xs md:text-sm text-gray-900 mt-1">{device.location}</p>
                    </div>

                    {/* Last Updated */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Updated: {status.lastUpdated.toLocaleTimeString()}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <MetricCard
            label="Online Devices"
            value={devices.filter((d) => d.status === 'online').length}
            icon={CheckIcon}
          />
          <MetricCard
            label="Offline Devices"
            value={devices.filter((d) => d.status === 'offline').length}
            icon={AlertIcon}
          />
          <MetricCard
            label="Drying"
            value={statusData.filter((s) => s.state === 'drying').length}
            icon={CheckIcon}
          />
        </div>
      </div>
    </Layout>
  );
}
