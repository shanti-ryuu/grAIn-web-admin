'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useLogin } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import Image from 'next/image'

type ApiError = {
  code?: string
  message?: string
  response?: {
    status?: number
    data?: {
      error?: string
      message?: string
      errorCode?: string
    }
  }
  request?: unknown
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Generate floating grain particles
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 4 + Math.random() * 8,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.25,
    })),
  [])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const validateLogin = (): boolean => {
    const nextErrors: Record<string, string> = {}
    if (!email.trim()) nextErrors.email = 'Email address is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Please enter a valid email address'
    if (!password) nextErrors.password = 'Password is required'
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const getLoginErrorMessage = (err: unknown): string => {
    const apiError = err as ApiError
    if (apiError.response?.status === 401) return 'Incorrect email or password. Please try again.'
    if (apiError.response?.status === 429) return 'Too many attempts. Please wait before trying again.'
    if (apiError.request || apiError.code === 'ERR_NETWORK' || apiError.message === 'Network Error') {
      return 'Cannot connect to server. Please check your connection.'
    }
    return apiError.response?.data?.error || apiError.response?.data?.message || 'Incorrect email or password. Please try again.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!validateLogin()) return

    try {
      await login.mutateAsync({ email, password })
      toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' })
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = getLoginErrorMessage(err)
      setFormError(msg)
      toast({ title: 'Login Failed', description: msg, variant: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Grain Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="grain-particle absolute rounded-full bg-green-600/30"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo/grain-logo.jpg"
              alt="grAIn Logo"
              width={64}
              height={64}
              className="rounded-xl object-contain"
              quality={95}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to grAIn</h1>
          <p className="text-gray-500 mt-2">AI-assisted IoT Solar-Powered Rice Grain Dryer</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }))
                  if (formError) setFormError('')
                }}
                autoComplete="email"
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white/60 backdrop-blur-sm ${
                  errors.email ? 'border-destructive focus:ring-destructive' : 'border-gray-200/60 focus:ring-green-800'
                }`}
                placeholder="admin@grain.com"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }))
                  if (formError) setFormError('')
                }}
                autoComplete="current-password"
                className={`w-full px-4 py-3 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white/60 backdrop-blur-sm ${
                  errors.password ? 'border-destructive focus:ring-destructive' : 'border-gray-200/60 focus:ring-green-800'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            {formError && (
              <div className="text-sm text-destructive bg-red-50 border border-destructive rounded-lg px-4 py-2.5">
                {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          grAIn Admin Dashboard v1.0
        </p>
      </div>
    </div>
  )
}
