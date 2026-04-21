import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'farmer'
}

export interface AuthStore {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  hydrate: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: (token: string, user: AuthUser) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    set({ token: null, user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  hydrate: () => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },
}))
