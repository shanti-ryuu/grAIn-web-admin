'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { SimpleChart } from '@/components/dashboard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { analyticsAPI, deviceAPI } from '@/lib/api/api';
import { AnalyticsData, Device } from '@/types';

export default function AnalyticsPage() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedDevice, setSelectedDevice] = useState('all');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch analytics data
    const fetchData = async () => {
      try {
        const [data, devicesList] = await Promise.all([
          analyticsAPI.getAnalyticsData(),
          deviceAPI.getDevices(),
        ]);

        setAnalyticsData(data);
        setDevices(devicesList);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleDateFilter = async () => {
    if (!dateRange.start || !dateRange.end) return;

    try {
      const filtered = await analyticsAPI.getFilteredAnalytics({
        startDate: new Date(dateRange.start),
        endDate: new Date(dateRange.end),
      });

      setAnalyticsData(filtered);
    } catch (error) {
      console.error('Failed to filter analytics:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  // Calculate summary stats
  const avgDryingTime = (analyticsData.reduce((sum, d) => sum + d.dryingTime, 0) / analyticsData.length).toFixed(1);
  const avgEfficiency = (analyticsData.reduce((sum, d) => sum + d.efficiency, 0) / analyticsData.length).toFixed(1);
  const avgTemperature = (analyticsData.reduce((sum, d) => sum + d.temperature, 0) / analyticsData.length).toFixed(1);

  // Prepare chart data
  const dryingTimeData = analyticsData.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.dryingTime,
  }));

  const efficiencyData = analyticsData.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.efficiency,
  }));

  const temperatureData = analyticsData.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.temperature,
  }));

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">Drying history and efficiency trends</p>
        </div>

        {/* Filters */}
        <Card className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 md:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 md:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 md:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Devices</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="primary" size="sm" className="w-full" onClick={handleDateFilter}>
                Apply Filter
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Average Drying Time</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{avgDryingTime}</p>
              <p className="text-xs text-gray-600 mt-1">Hours per cycle</p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Average Efficiency</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">{avgEfficiency}%</p>
              <p className="text-xs text-gray-600 mt-1">System performance</p>
            </div>
          </Card>
          <Card className="p-4 md:p-6">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-2">Average Temperature</p>
              <p className="text-2xl md:text-3xl font-bold text-orange-600">{avgTemperature}°C</p>
              <p className="text-xs text-gray-600 mt-1">Operating temperature</p>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <SimpleChart
            title="Drying Time (Hours)"
            data={dryingTimeData}
            maxValue={60}
          />
          <SimpleChart
            title="System Efficiency (%)"
            data={efficiencyData}
            maxValue={100}
          />
        </div>

        <SimpleChart
          title="Temperature Trends (°C)"
          data={temperatureData}
          maxValue={55}
        />

        {/* Detailed Table */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Detailed Analytics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900">Time (h)</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900">Efficiency</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900">Temp</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900 hidden sm:table-cell">Humidity</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold text-gray-900 hidden md:table-cell">Moisture</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-4 py-3 text-gray-900">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-gray-900">{row.dryingTime}</td>
                    <td className="px-3 md:px-4 py-3">
                      <Badge variant={row.efficiency > 90 ? 'success' : 'warning'}>
                        {row.efficiency.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-gray-900">{row.temperature.toFixed(1)}°C</td>
                    <td className="px-3 md:px-4 py-3 text-gray-900 hidden sm:table-cell">{row.humidity.toFixed(1)}%</td>
                    <td className="px-3 md:px-4 py-3 text-gray-900 hidden md:table-cell">{row.moisture.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
