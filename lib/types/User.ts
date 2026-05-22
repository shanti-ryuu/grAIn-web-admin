export interface User {
  _id: string
  id?: string
  name: string
  email: string
  role: 'admin' | 'farmer'
  status: 'active' | 'inactive'
  profileImage?: string | null
  bio?: string
  phoneNumber?: string
  location?: string
  deviceCount?: number
  createdAt: string
  updatedAt: string
}
