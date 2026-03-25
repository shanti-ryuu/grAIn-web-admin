'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  isAuthenticated: boolean
  user: { email: string; name: string } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const router = useRouter()

  // Check authentication on mount
  useEffect(() => {
    const authData = localStorage.getItem('grAIn_auth')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        setUser(parsed)
        setIsAuthenticated(true)
      } catch (e) {
        localStorage.removeItem('grAIn_auth')
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    // Mock authentication
    if (email && password && password.length >= 6) {
      const userData = {
        email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      }
      localStorage.setItem('grAIn_auth', JSON.stringify(userData))
      setUser(userData)
      setIsAuthenticated(true)
      router.push('/dashboard')
    } else {
      throw new Error('Invalid credentials')
    }
  }

  const logout = () => {
    localStorage.removeItem('grAIn_auth')
    setUser(null)
    setIsAuthenticated(false)
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
