'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useLogin } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Client-side validation
    if (!email.trim()) { setFormError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Please enter a valid email address'); return }
    if (!password || password.length < 6) { setFormError('Password must be at least 6 characters'); return }

    try {
      await login.mutateAsync({ email, password })
      toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' })
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Invalid email or password. Please try again.'
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent bg-white/60 backdrop-blur-sm"
                placeholder="admin@grain.com"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-10 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent bg-white/60 backdrop-blur-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
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
