'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Logo from '@/components/ui/Logo';
import { authAPI } from '@/lib/api/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);

      // Store token in localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-4">
      <div className="relative w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8 space-y-3">
          <div className="flex justify-center mb-4">
            <div className="inline-block p-3 bg-gray-100 rounded-lg">
              <Logo size="lg" showText={false} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">grAIn Admin</h1>
          <p className="text-sm text-gray-600">Rice Grain Dryer System</p>
        </div>

        {/* Login Card */}
        <Card variant="default" className="p-8 space-y-6 mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-sm text-gray-600">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <p className="font-semibold mb-1">Login Error</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="pt-6 border-t border-gray-200 space-y-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Demo Credentials</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
              <div>
                <p className="text-gray-600 font-medium mb-2">Email</p>
                <p className="font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200 text-xs">admin@example.com</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium mb-2">Password</p>
                <p className="font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200 text-xs">admin123</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs">
          <span>Secure login • IoT Dashboard</span>
        </p>
      </div>
    </div>
  );
}
