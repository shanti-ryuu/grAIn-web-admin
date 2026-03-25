export const mockDevices = [
  {
    id: 'GR-001',
    status: 'online',
    location: 'Farm A, Plot 1',
    lastActive: '2 minutes ago',
    assignedUser: 'Joshua Santelices',
  },
  {
    id: 'GR-002',
    status: 'online',
    location: 'Farm A, Plot 2',
    lastActive: '5 minutes ago',
    assignedUser: 'Kenneth Radin',
  },
  {
    id: 'GR-003',
    status: 'offline',
    location: 'Farm B, Plot 1',
    lastActive: '2 hours ago',
    assignedUser: 'Joshua Santelices',
  },
  {
    id: 'GR-004',
    status: 'online',
    location: 'Farm B, Plot 3',
    lastActive: '1 minute ago',
    assignedUser: 'Prince Moya',
  },
  {
    id: 'GR-005',
    status: 'online',
    location: 'Farm C, Plot 2',
    lastActive: '8 minutes ago',
    assignedUser: 'Mark Lar',
  },
]

export const mockAlerts = [
  {
    id: 1,
    timestamp: '2024-03-26 14:30',
    severity: 'warning',
    message: 'High temperature detected on Device GR-001',
  },
  {
    id: 2,
    timestamp: '2024-03-26 13:15',
    severity: 'critical',
    message: 'Device GR-003 offline for more than 1 hour',
  },
  {
    id: 3,
    timestamp: '2024-03-26 12:45',
    severity: 'info',
    message: 'Drying cycle completed on Device GR-002',
  },
  {
    id: 4,
    timestamp: '2024-03-26 11:20',
    severity: 'warning',
    message: 'Low battery on Device GR-005',
  },
  {
    id: 5,
    timestamp: '2024-03-26 10:05',
    severity: 'info',
    message: 'Maintenance scheduled for Device GR-004',
  },
]

export const mockAnalytics = [
  { time: '00:00', temperature: 28, moisture: 85 },
  { time: '04:00', temperature: 32, moisture: 78 },
  { time: '08:00', temperature: 38, moisture: 68 },
  { time: '12:00', temperature: 42, moisture: 55 },
  { time: '16:00', temperature: 40, moisture: 48 },
  { time: '20:00', temperature: 35, moisture: 42 },
  { time: '24:00', temperature: 30, moisture: 38 },
]

export const mockReports = [
  {
    id: 1,
    name: 'Daily Report - Mar 26',
    date: '2024-03-26',
    type: 'daily',
  },
  {
    id: 2,
    name: 'Weekly Report - Mar 20-26',
    date: '2024-03-26',
    type: 'weekly',
  },
  {
    id: 3,
    name: 'Daily Report - Mar 25',
    date: '2024-03-25',
    type: 'daily',
  },
  {
    id: 4,
    name: 'Weekly Report - Mar 13-19',
    date: '2024-03-19',
    type: 'weekly',
  },
  {
    id: 5,
    name: 'Daily Report - Mar 24',
    date: '2024-03-24',
    type: 'daily',
  },
]

export const mockUsers = [
  {
    id: 1,
    name: 'Joshua Santelices',
    role: 'farmer',
    email: 'joshua.santelices@gmail.com',
    lastActive: '2 minutes ago',
    status: 'active',
  },
  {
    id: 2,
    name: 'Kenneth Radin',
    role: 'farmer',
    email: 'kenneth.radin@gmail.com',
    lastActive: '30 minutes ago',
    status: 'active',
  },
  {
    id: 3,
    name: 'Prince Moya',
    role: 'admin',
    email: 'prince.moya@gmail.com',
    lastActive: '1 hour ago',
    status: 'active',
  },
  {
    id: 4,
    name: 'Marek Lar',
    role: 'farmer',
    email: 'marek.lar@gmail.com',
    lastActive: '5 hours ago',
    status: 'inactive',
  },
  {
    id: 5,
    name: 'Admin User',
    role: 'admin',
    email: 'admin@gmail.com',
    lastActive: '5 minutes ago',
    status: 'active',
  },
]

export const mockDryingTimeData = [
  { device: 'GR-001', time: 4.5 },
  { device: 'GR-002', time: 5.2 },
  { device: 'GR-003', time: 4.8 },
  { device: 'GR-004', time: 5.5 },
  { device: 'GR-005', time: 4.3 },
]
