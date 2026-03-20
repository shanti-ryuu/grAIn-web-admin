import {
  User,
  Device,
  SensorData,
  DeviceStatus,
  DashboardMetrics,
  AnalyticsData,
  SystemSettings,
} from '@/types';

// Mock Users Data
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    status: 'active',
    role: 'farmer',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-2',
    name: 'Priya Singh',
    email: 'priya.singh@example.com',
    status: 'active',
    role: 'farmer',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'user-3',
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    status: 'inactive',
    role: 'farmer',
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'user-4',
    name: 'Deepak Sharma',
    email: 'deepak.sharma@example.com',
    status: 'active',
    role: 'technician',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-5',
    name: 'Joshua Santelices',
    email: 'joshua.santelices@example.com',
    status: 'active',
    role: 'admin',
    createdAt: new Date('2023-12-01'),
  },
  {
    id: 'user-6',
    name: 'Kenneth Radin',
    email: 'kenneth.radin@example.com',
    status: 'active',
    role: 'admin',
    createdAt: new Date('2023-12-01'),
  },
];

// Mock Devices Data
export const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Dryer Unit - Field A',
    deviceId: 'DRY-001',
    userId: 'user-1',
    status: 'online',
    location: 'Field A, Village A',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'device-2',
    name: 'Dryer Unit - Field B',
    deviceId: 'DRY-002',
    userId: 'user-2',
    status: 'online',
    location: 'Field B, Village B',
    createdAt: new Date('2024-02-25'),
  },
  {
    id: 'device-3',
    name: 'Dryer Unit - Field C',
    deviceId: 'DRY-003',
    userId: 'user-3',
    status: 'offline',
    location: 'Field C, Village C',
    createdAt: new Date('2024-03-15'),
  },
  {
    id: 'device-4',
    name: 'Dryer Unit - Field D',
    deviceId: 'DRY-004',
    userId: 'user-1',
    status: 'online',
    location: 'Field D, Village A',
    createdAt: new Date('2024-02-10'),
  },
  {
    id: 'device-5',
    name: 'Dryer Unit - Field E',
    deviceId: 'DRY-005',
    userId: 'user-2',
    status: 'online',
    location: 'Field E, Village B',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'device-6',
    name: 'Dryer Unit - Storage',
    deviceId: 'DRY-006',
    userId: 'user-1',
    status: 'offline',
    location: 'Main Storage, Village A',
    createdAt: new Date('2024-01-05'),
  },
];

// Mock Sensor Data
export const mockSensorData: SensorData[] = [
  {
    id: 'sensor-1',
    deviceId: 'device-1',
    temperature: 45.2,
    humidity: 65.3,
    moisture: 12.5,
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'sensor-2',
    deviceId: 'device-1',
    temperature: 44.8,
    humidity: 64.1,
    moisture: 12.3,
    timestamp: new Date(Date.now() - 10 * 60000),
  },
  {
    id: 'sensor-3',
    deviceId: 'device-2',
    temperature: 48.1,
    humidity: 68.5,
    moisture: 14.2,
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'sensor-4',
    deviceId: 'device-2',
    temperature: 47.9,
    humidity: 67.8,
    moisture: 14.0,
    timestamp: new Date(Date.now() - 10 * 60000),
  },
  {
    id: 'sensor-5',
    deviceId: 'device-4',
    temperature: 43.5,
    humidity: 62.0,
    moisture: 11.8,
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'sensor-6',
    deviceId: 'device-4',
    temperature: 43.2,
    humidity: 61.5,
    moisture: 11.6,
    timestamp: new Date(Date.now() - 10 * 60000),
  },
  {
    id: 'sensor-7',
    deviceId: 'device-5',
    temperature: 46.7,
    humidity: 66.2,
    moisture: 13.1,
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'sensor-8',
    deviceId: 'device-5',
    temperature: 46.5,
    humidity: 65.8,
    moisture: 12.9,
    timestamp: new Date(Date.now() - 10 * 60000),
  },
];

// Mock Device Status
export const mockDeviceStatus: DeviceStatus[] = [
  {
    deviceId: 'device-1',
    state: 'drying',
    temperature: 45.2,
    humidity: 65.3,
    moisture: 12.5,
    lastUpdated: new Date(),
  },
  {
    deviceId: 'device-2',
    state: 'drying',
    temperature: 48.1,
    humidity: 68.5,
    moisture: 14.2,
    lastUpdated: new Date(),
  },
  {
    deviceId: 'device-3',
    state: 'idle',
    temperature: 28.0,
    humidity: 45.0,
    moisture: 25.0,
    lastUpdated: new Date(Date.now() - 2 * 3600000),
  },
  {
    deviceId: 'device-4',
    state: 'drying',
    temperature: 43.5,
    humidity: 62.0,
    moisture: 11.8,
    lastUpdated: new Date(),
  },
  {
    deviceId: 'device-5',
    state: 'drying',
    temperature: 46.7,
    humidity: 66.2,
    moisture: 13.1,
    lastUpdated: new Date(),
  },
  {
    deviceId: 'device-6',
    state: 'error',
    temperature: 35.0,
    humidity: 55.0,
    moisture: 20.0,
    lastUpdated: new Date(Date.now() - 24 * 3600000),
  },
];

// Mock Dashboard Metrics
export const mockDashboardMetrics: DashboardMetrics = {
  totalFarmers: mockUsers.filter((u) => u.role === 'farmer').length,
  activeDevices: mockDevices.filter((d) => d.status === 'online').length,
  avgTemperature: 45.8,
  avgHumidity: 65.5,
  systemStatus: 'online',
};

// Mock Analytics Data
export const mockAnalyticsData: AnalyticsData[] = [
  {
    date: '2024-03-10',
    dryingTime: 48,
    efficiency: 92.5,
    temperature: 44.2,
    humidity: 63.5,
    moisture: 13.0,
  },
  {
    date: '2024-03-11',
    dryingTime: 45,
    efficiency: 94.2,
    temperature: 45.1,
    humidity: 64.2,
    moisture: 12.8,
  },
  {
    date: '2024-03-12',
    dryingTime: 50,
    efficiency: 90.8,
    temperature: 44.8,
    humidity: 65.0,
    moisture: 13.5,
  },
  {
    date: '2024-03-13',
    dryingTime: 46,
    efficiency: 93.5,
    temperature: 45.5,
    humidity: 64.8,
    moisture: 12.5,
  },
  {
    date: '2024-03-14',
    dryingTime: 48,
    efficiency: 92.1,
    temperature: 45.2,
    humidity: 65.2,
    moisture: 12.9,
  },
  {
    date: '2024-03-15',
    dryingTime: 47,
    efficiency: 93.8,
    temperature: 45.8,
    humidity: 65.5,
    moisture: 12.4,
  },
  {
    date: '2024-03-16',
    dryingTime: 49,
    efficiency: 91.5,
    temperature: 44.5,
    humidity: 66.0,
    moisture: 13.2,
  },
];

// Mock System Settings
export const mockSystemSettings: SystemSettings = {
  autoMode: true,
  maxTemperature: 50,
  minTemperature: 35,
  targetMoisture: 12,
  refreshInterval: 5000,
};

// Mock User for Authentication
export const mockAuthUser = {
  id: 'user-5',
  name: 'Joshua Santelices',
  email: 'joshua.santelices@example.com',
  role: 'admin',
};
