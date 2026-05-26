export interface UpdateUserInput {
  name?: string
  role?: 'admin' | 'farmer'
  status?: 'active' | 'inactive'
}
