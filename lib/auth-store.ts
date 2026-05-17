import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/lib/types'

export type AuthUser = Pick<User, 'email' | 'name' | 'role' | 'profileImage'> & {
  id: string
}

export interface AuthStore {
  user: AuthUser | null
  isHydrated: boolean
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: AuthUser) => void
  clearAuth: () => void
  logout: () => void
  setHydrated: () => void
  hydrate: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<AuthUser>) => void
  login: (user: AuthUser) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user: AuthUser) => set({
        user, isAuthenticated: true, isLoading: false
      }),

      login: (user: AuthUser) => set({
        user, isAuthenticated: true, isLoading: false
      }),

      clearAuth: () => set({
        user: null, isAuthenticated: false, isLoading: false
      }),

      logout: () => set({
        user: null, isAuthenticated: false, isLoading: false
      }),

      setHydrated: () => set((state) => ({
        isHydrated: true,
        isAuthenticated: !!state.user,
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthStore> | undefined
        return { user: state?.user ?? null }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
