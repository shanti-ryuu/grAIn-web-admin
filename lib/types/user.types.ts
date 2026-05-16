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

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: 'admin' | 'farmer'
}

export interface UpdateUserInput {
  name?: string
  role?: 'admin' | 'farmer'
  status?: 'active' | 'inactive'
}

export interface UpdateProfileInput {
  name?: string
  bio?: string
  phoneNumber?: string
  location?: string
  profileImage?: string | null
}

export interface PaginatedUsers {
  users: User[]
  total: number
  page: number
  totalPages: number
  limit: number
}
