'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useLogin } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login.mutateAsync({ email, password })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#166534] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6b7280]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-[#ffffff] rounded-2xl border border-[#e5e7eb] p-8 md:p-10">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src="/logo/grain-logo.jpg"
                alt="grAIn Logo"
                className="w-12 h-12 rounded-xl object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#111827] mb-1">grAIn Admin</h1>
            <p className="text-sm text-[#6b7280]">Rice Grain Drying System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent transition-all bg-[#ffffff]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-transparent transition-all bg-[#ffffff]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-2.5 bg-[#166534] text-white rounded-lg font-medium hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-6"
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
            <p className="text-xs text-[#6b7280] text-center">
              Enter your admin credentials to access the dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
