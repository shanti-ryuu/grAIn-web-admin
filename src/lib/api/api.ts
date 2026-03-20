import {
  User,
  Device,
  SensorData,
  DeviceStatus,
  DashboardMetrics,
  AnalyticsData,
  SystemSettings,
} from '@/types';
import {
  mockUsers,
  mockDevices,
  mockSensorData,
  mockDeviceStatus,
  mockDashboardMetrics,
  mockAnalyticsData,
  mockSystemSettings,
  mockAuthUser,
} from '@/data/mockData';

/**
 * API Endpoints mapping for future backend integration
 * Replace these with actual API endpoints
 */
const API_ENDPOINTS = {
  // Users
  GET_USERS: '/api/users',
  GET_USER_BY_ID: '/api/users/:id',
  UPDATE_USER: '/api/users/:id',
  DELETE_USER: '/api/users/:id',

  // Devices
  GET_DEVICES: '/api/devices',
  GET_DEVICE_BY_ID: '/api/devices/:id',
  CREATE_DEVICE: '/api/devices',
  UPDATE_DEVICE: '/api/devices/:id',
  ASSIGN_DEVICE: '/api/devices/:id/assign',

  // Sensor Data
  GET_SENSOR_DATA: '/api/sensors/data',
  GET_DEVICE_SENSOR_DATA: '/api/devices/:id/sensors',

  // Device Status
  GET_DEVICE_STATUS: '/api/devices/:id/status',
  GET_ALL_DEVICE_STATUS: '/api/devices/status/all',

  // Dashboard
  GET_DASHBOARD_METRICS: '/api/dashboard/metrics',

  // Analytics
  GET_ANALYTICS: '/api/analytics',
  GET_ANALYTICS_FILTERED: '/api/analytics/filter',

  // Settings
  GET_SETTINGS: '/api/settings',
  UPDATE_SETTINGS: '/api/settings',

  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  GET_CURRENT_USER: '/api/auth/me',
};

/**
 * Simulates an API delay
 */
const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * User API Functions
 */
export const userAPI = {
  /**
   * Fetch all users
   * Endpoint: GET /api/users
   */
  async getUsers(): Promise<User[]> {
    await simulateDelay(500);
    return mockUsers;
  },

  /**
   * Fetch a user by ID
   * Endpoint: GET /api/users/:id
   */
  async getUserById(id: string): Promise<User | null> {
    await simulateDelay(300);
    return mockUsers.find((u) => u.id === id) || null;
  },

  /**
   * Update user status
   * Endpoint: PATCH /api/users/:id
   */
  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    await simulateDelay(400);
    const user = mockUsers.find((u) => u.id === id);
    if (user) {
      Object.assign(user, data);
      return user;
    }
    return null;
  },

  /**
   * Delete a user
   * Endpoint: DELETE /api/users/:id
   */
  async deleteUser(id: string): Promise<boolean> {
    await simulateDelay(300);
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index > -1) {
      mockUsers.splice(index, 1);
      return true;
    }
    return false;
  },
};

/**
 * Device API Functions
 */
export const deviceAPI = {
  /**
   * Fetch all devices
   * Endpoint: GET /api/devices
   */
  async getDevices(): Promise<Device[]> {
    await simulateDelay(500);
    return mockDevices;
  },

  /**
   * Fetch a device by ID
   * Endpoint: GET /api/devices/:id
   */
  async getDeviceById(id: string): Promise<Device | null> {
    await simulateDelay(300);
    return mockDevices.find((d) => d.id === id) || null;
  },

  /**
   * Get devices by user
   */
  async getDevicesByUser(userId: string): Promise<Device[]> {
    await simulateDelay(400);
    return mockDevices.filter((d) => d.userId === userId);
  },

  /**
   * Create a new device
   * Endpoint: POST /api/devices
   */
  async createDevice(data: Omit<Device, 'id' | 'createdAt'>): Promise<Device> {
    await simulateDelay(500);
    const newDevice: Device = {
      ...data,
      id: `device-${mockDevices.length + 1}`,
      createdAt: new Date(),
    };
    mockDevices.push(newDevice);
    return newDevice;
  },

  /**
   * Update device
   * Endpoint: PATCH /api/devices/:id
   */
  async updateDevice(id: string, data: Partial<Device>): Promise<Device | null> {
    await simulateDelay(400);
    const device = mockDevices.find((d) => d.id === id);
    if (device) {
      Object.assign(device, data);
      return device;
    }
    return null;
  },

  /**
   * Assign device to user
   * Endpoint: POST /api/devices/:id/assign
   */
  async assignDevice(deviceId: string, userId: string): Promise<Device | null> {
    await simulateDelay(400);
    return this.updateDevice(deviceId, { userId });
  },
};

/**
 * Sensor Data API Functions
 */
export const sensorAPI = {
  /**
   * Fetch all sensor data
   * Endpoint: GET /api/sensors/data
   */
  async getSensorData(): Promise<SensorData[]> {
    await simulateDelay(500);
    return mockSensorData;
  },

  /**
   * Fetch sensor data for a specific device
   * Endpoint: GET /api/devices/:id/sensors
   */
  async getDeviceSensorData(deviceId: string): Promise<SensorData[]> {
    await simulateDelay(400);
    return mockSensorData.filter((s) => s.deviceId === deviceId);
  },

  /**
   * Fetch latest sensor data for a device
   */
  async getLatestSensorData(deviceId: string): Promise<SensorData | null> {
    await simulateDelay(300);
    const data = mockSensorData
      .filter((s) => s.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return data[0] || null;
  },
};

/**
 * Device Status API Functions
 */
export const deviceStatusAPI = {
  /**
   * Fetch device status
   * Endpoint: GET /api/devices/:id/status
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
    await simulateDelay(400);
    return mockDeviceStatus.find((s) => s.deviceId === deviceId) || null;
  },

  /**
   * Fetch all device statuses
   * Endpoint: GET /api/devices/status/all
   */
  async getAllDeviceStatus(): Promise<DeviceStatus[]> {
    await simulateDelay(500);
    return mockDeviceStatus;
  },
};

/**
 * Dashboard API Functions
 */
export const dashboardAPI = {
  /**
   * Fetch dashboard metrics
   * Endpoint: GET /api/dashboard/metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await simulateDelay(500);
    return mockDashboardMetrics;
  },
};

/**
 * Analytics API Functions
 */
export const analyticsAPI = {
  /**
   * Fetch analytics data
   * Endpoint: GET /api/analytics
   */
  async getAnalyticsData(): Promise<AnalyticsData[]> {
    await simulateDelay(600);
    return mockAnalyticsData;
  },

  /**
   * Fetch filtered analytics data
   * Endpoint: GET /api/analytics/filter
   */
  async getFilteredAnalytics(filters: {
    deviceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AnalyticsData[]> {
    await simulateDelay(600);
    let data = [...mockAnalyticsData];

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      data = data.filter((d) => new Date(d.date).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      data = data.filter((d) => new Date(d.date).getTime() <= end);
    }

    return data;
  },
};

/**
 * Settings API Functions
 */
export const settingsAPI = {
  /**
   * Fetch system settings
   * Endpoint: GET /api/settings
   */
  async getSettings(): Promise<SystemSettings> {
    await simulateDelay(300);
    return mockSystemSettings;
  },

  /**
   * Update system settings
   * Endpoint: PATCH /api/settings
   */
  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    await simulateDelay(400);
    Object.assign(mockSystemSettings, data);
    return mockSystemSettings;
  },
};

/**
 * Authentication API Functions
 */
export const authAPI = {
  /**
   * Login
   * Endpoint: POST /api/auth/login
   */
  async login(email: string, password: string): Promise<{ user: typeof mockAuthUser; token: string }> {
    await simulateDelay(800);

    // Mock validation
    if (email === 'admin@example.com' && password === 'admin123') {
      return {
        user: mockAuthUser,
        token: 'mock-jwt-token-' + Date.now(),
      };
    }

    throw new Error('Invalid credentials');
  },

  /**
   * Logout
   * Endpoint: POST /api/auth/logout
   */
  async logout(): Promise<boolean> {
    await simulateDelay(300);
    return true;
  },

  /**
   * Get current user
   * Endpoint: GET /api/auth/me
   */
  async getCurrentUser(): Promise<typeof mockAuthUser> {
    await simulateDelay(300);
    return mockAuthUser;
  },
};

export { API_ENDPOINTS };
