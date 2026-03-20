'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { MetricCard, SystemStatus, SimpleChart } from '@/components/dashboard';
import Card from '@/components/ui/Card';
import { dashboardAPI, sensorAPI } from '@/lib/api/api';
import { DashboardMetrics, SensorData } from '@/types';
import { FarmerIcon, SignalIcon, TemperatureIcon, HumidityIcon, CheckIcon, AlertIcon } from '@/components/icons';

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch dashboard data
    const fetchData = async () => {
      try {
        const [metricsData, sensorsData] = await Promise.all([
          dashboardAPI.getDashboardMetrics(),
          sensorAPI.getSensorData(),
        ]);

        setMetrics(metricsData);
        setSensorData(sensorsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (!metrics) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  // Prepare temperature data for chart
  const temperatureData = sensorData.slice(0, 5).map((data, idx) => ({
    label: `Device ${idx + 1}`,
    value: data.temperature,
  }));

  // Prepare humidity data for chart
  const humidityData = sensorData.slice(0, 5).map((data, idx) => ({
    label: `Device ${idx + 1}`,
    value: data.humidity,
  }));

  return (
    <Layout>
      <div className="space-y-10">
        {/* Header Section */}
        <div className="pt-4 pb-2">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-3 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl">Welcome back! Here's an overview of your system status and key metrics at a glance.</p>
        </div>

        {/* Metrics Cards Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Key Metrics</h2>
            <p className="text-gray-500 text-sm">Real-time overview of your system performance</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total Farmers"
              value={metrics.totalFarmers}
              icon={FarmerIcon}
              trend={{ value: 12, direction: 'up' }}
            />
            <MetricCard
              label="Active Devices"
              value={metrics.activeDevices}
              icon={SignalIcon}
              trend={{ value: 5, direction: 'down' }}
            />
            <MetricCard
              label="Avg Temperature (°C)"
              value={metrics.avgTemperature.toFixed(1)}
              icon={TemperatureIcon}
              trend={{ value: 2, direction: 'up' }}
            />
            <MetricCard
              label="Avg Humidity (%)"
              value={metrics.avgHumidity.toFixed(1)}
              icon={HumidityIcon}
              trend={{ value: 1, direction: 'down' }}
            />
          </div>
        </div>

        {/* Analytics Section */}
        <div className="space-y-6 pt-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">System Analytics</h2>
            <p className="text-gray-500 text-sm">Detailed insights into device metrics and system performance</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SystemStatus status={metrics.systemStatus} lastChecked={new Date()} />
            <SimpleChart
              title="Temperature Distribution"
              data={temperatureData}
              maxValue={55}
            />
            <SimpleChart
              title="Humidity Levels"
              data={humidityData}
              maxValue={100}
            />
          </div>
        </div>

        {/* System Information Section */}
        <div className="space-y-6 pt-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">System Overview</h2>
            <p className="text-gray-500 text-sm">Quick statistics and device monitoring information</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 md:p-7 space-y-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100" variant="default">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">System Status</p>
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{metrics.systemStatus === 'online' ? 'Online' : 'Offline'}</p>
            </Card>
            <Card className="p-6 md:p-7 space-y-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100" variant="default">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Last Updated</p>
              <p className="text-3xl font-bold font-mono text-gray-900">{new Date().toLocaleTimeString('en-US', { hour12: false })}</p>
            </Card>
            <Card className="p-6 md:p-7 space-y-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100" variant="default">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Devices</p>
              <p className="text-3xl font-bold text-gray-900">{sensorData.length}</p>
            </Card>
            <Card className="p-6 md:p-7 space-y-4 bg-gradient-to-br from-orange-50 to-white border border-orange-100" variant="default">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Data Points</p>
              <p className="text-3xl font-bold text-gray-900">{sensorData.length}</p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
