'use client'

import { ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/auth-store'
import { initFirebaseAnalytics } from '@/lib/firebase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
    initFirebaseAnalytics()
  }, [hydrate])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
