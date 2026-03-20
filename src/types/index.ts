// User types
export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: 'admin' | 'farmer' | 'technician';
  createdAt: Date;
}

// Device types
export interface Device {
  id: string;
  name: string;
  deviceId: string;
  userId: string;
  status: 'online' | 'offline' | 'error';
  location: string;
  createdAt: Date;
}

// Sensor data types
export interface SensorData {
  id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  moisture: number;
  timestamp: Date;
}

// Device status types
export interface DeviceStatus {
  deviceId: string;
  state: 'drying' | 'idle' | 'error';
  temperature: number;
  humidity: number;
  moisture: number;
  lastUpdated: Date;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalFarmers: number;
  activeDevices: number;
  avgTemperature: number;
  avgHumidity: number;
  systemStatus: 'online' | 'offline';
}

// Analytics data
export interface AnalyticsData {
  date: string;
  dryingTime: number;
  efficiency: number;
  temperature: number;
  humidity: number;
  moisture: number;
}

// Settings
export interface SystemSettings {
  autoMode: boolean;
  maxTemperature: number;
  minTemperature: number;
  targetMoisture: number;
  refreshInterval: number;
}
