import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/lib/types'

export type AuthUser = Pick<User, 'email' | 'name' | 'role' | 'profileImage'> & {
  id: string
}

export interface AuthStore {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isHydrated: boolean
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void
  clearAuth: () => void
  logout: () => void
  setHydrated: () => void
  hydrate: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<AuthUser>) => void
  login: (token: string, user: AuthUser, refreshToken?: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isHydrated: false,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token: string, user: AuthUser, refreshToken?: string) => set({
        token, user, refreshToken: refreshToken ?? null, isAuthenticated: true, isLoading: false
      }),

      login: (token: string, user: AuthUser, refreshToken?: string) => set({
        token, user, refreshToken: refreshToken ?? null, isAuthenticated: true, isLoading: false
      }),

      clearAuth: () => set({
        token: null, user: null, refreshToken: null, isAuthenticated: false, isLoading: false
      }),

      logout: () => set({
        token: null, user: null, refreshToken: null, isAuthenticated: false, isLoading: false
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
      partialize: (state) => ({ token: state.token, user: state.user, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
