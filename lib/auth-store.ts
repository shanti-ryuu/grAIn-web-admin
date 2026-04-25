import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  isHydrated: boolean
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  logout: () => void
  setHydrated: () => void
  hydrate: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<AuthUser>) => void
  login: (token: string, user: AuthUser) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isHydrated: false,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token: string, user: AuthUser) => set({
        token, user, isAuthenticated: true, isLoading: false
      }),

      login: (token: string, user: AuthUser) => set({
        token, user, isAuthenticated: true, isLoading: false
      }),

      clearAuth: () => set({
        token: null, user: null, isAuthenticated: false, isLoading: false
      }),

      logout: () => set({
        token: null, user: null, isAuthenticated: false, isLoading: false
      }),

      setHydrated: () => set((state) => ({
        isHydrated: true,
        isAuthenticated: !!(state.token && state.user),
        isLoading: false,
      })),

      hydrate: () => {
        // No-op: persist middleware handles rehydration automatically
        // Just mark as hydrated if persist already rehydrated
        set({ isHydrated: true, isLoading: false })
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      updateUser: (updates: Partial<AuthUser>) => set((state) => {
        if (!state.user) return state
        return { user: { ...state.user, ...updates } }
      }),
    }),
    {
      name: 'grain-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
