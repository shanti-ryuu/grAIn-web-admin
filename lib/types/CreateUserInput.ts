export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: 'admin' | 'farmer'
}
