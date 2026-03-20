'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { settingsAPI } from '@/lib/api/api';
import { SystemSettings } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Fetch settings
    const fetchSettings = async () => {
      try {
        const data = await settingsAPI.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleToggleAutoMode = async () => {
    if (!settings) return;

    const newSettings = { ...settings, autoMode: !settings.autoMode };
    setSettings(newSettings);

    try {
      await settingsAPI.updateSettings({ autoMode: newSettings.autoMode });
      setSaveMessage('✓ Auto-refresh setting updated');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSaveMessage('✗ Failed to save settings');
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveAllSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await settingsAPI.updateSettings(settings);
      setSaveMessage('✓ All settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('✗ Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2">Configure system behavior and parameters</p>
        </div>

        {/* Operation Mode */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Operation Mode</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                {settings.autoMode
                  ? 'System is in Automatic Mode - All sensors are auto-adjusted'
                  : 'System is in Manual Mode - Requires manual adjustments'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 gap-2 sm:gap-4">
              <Badge variant={settings.autoMode ? 'success' : 'warning'}>
                {settings.autoMode ? 'AUTO' : 'MANUAL'}
              </Badge>
              <Button
                variant={settings.autoMode ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleAutoMode}
              >
                Switch to {settings.autoMode ? 'Manual' : 'Auto'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Temperature Settings */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">Temperature Control</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4">
            <Input
              label="Maximum Temperature (°C)"
              type="number"
              value={settings.maxTemperature}
              onChange={(e) => handleSettingChange('maxTemperature', parseFloat(e.target.value))}
              step="0.5"
            />
            <Input
              label="Minimum Temperature (°C)"
              type="number"
              value={settings.minTemperature}
              onChange={(e) => handleSettingChange('minTemperature', parseFloat(e.target.value))}
              step="0.5"
            />
          </div>
          <div className="mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded text-xs md:text-sm text-blue-800">
            ℹ️ These limits will trigger alerts if exceeded during drying operations.
          </div>
        </Card>

        {/* Moisture Settings */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">Moisture Control</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <Input
              label="Target Moisture Level (%)"
              type="number"
              value={settings.targetMoisture}
              onChange={(e) => handleSettingChange('targetMoisture', parseFloat(e.target.value))}
              step="0.5"
            />
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">Current Status</p>
              <p className="text-sm md:text-base text-gray-900">
                Target is set to {settings.targetMoisture}% for new drying cycles
              </p>
            </div>
          </div>
        </Card>

        {/* Refresh Settings */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">Data Refresh</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <Input
              label="Refresh Interval (milliseconds)"
              type="number"
              value={settings.refreshInterval}
              onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
              step="1000"
              min="1000"
            />
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-700 mb-2">Update Frequency</p>
              <p className="text-sm md:text-base text-gray-900">
                System updates every {(settings.refreshInterval / 1000).toFixed(1)} seconds
              </p>
            </div>
          </div>
        </Card>

        {/* API Endpoints Documentation */}
        <Card variant="bordered" className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">API Integration</h3>
          <div className="bg-gray-50 p-3 md:p-4 rounded text-xs md:text-sm font-mono text-gray-800 overflow-x-auto">
            <p className="mb-2">Backend API endpoints are configured in: <code>src/lib/api/api.ts</code></p>
            <p className="mb-2">Current endpoints:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>GET /api/dashboard/metrics</li>
              <li>GET /api/devices</li>
              <li>GET /api/users</li>
              <li>GET /api/sensors/data</li>
              <li>PATCH /api/settings</li>
            </ul>
          </div>
        </Card>

        {/* Save Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {saveMessage && (
              <p className={`text-xs md:text-sm ${saveMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </p>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSaveAllSettings}
            disabled={isSaving}
          >
            {isSaving ? '💾 Saving...' : '💾 Save All Settings'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
