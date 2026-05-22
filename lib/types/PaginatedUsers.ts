import type { User } from './User'

export interface PaginatedUsers {
  users: User[]
  total: number
  page: number
  totalPages: number
  limit: number
}
