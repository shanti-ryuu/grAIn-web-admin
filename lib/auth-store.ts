import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'farmer'
  profileImage?: string | null
}

export interface AuthStore {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isHydrated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  hydrate: () => void
  updateUser: (updates: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isHydrated: false,

  login: (token: string, user: AuthUser) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true, isLoading: false, isHydrated: true })
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    set({ token: null, user: null, isAuthenticated: false, isLoading: false, isHydrated: true })
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
        // Check if JWT is expired before restoring session
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          set({ isLoading: false, isHydrated: true })
          return
        }
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true, isLoading: false, isHydrated: true })
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({ isLoading: false, isHydrated: true })
      }
    } else {
      set({ isLoading: false, isHydrated: true })
    }
  },

  // FIX 3 + FIX 6: Update user data in store (for profile changes)
  updateUser: (updates: Partial<AuthUser>) => {
    set((state) => {
      if (!state.user) return state
      const updatedUser = { ...state.user, ...updates }
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      return { user: updatedUser }
    })
  },
}))
