import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = { title: '404 — Not Found' }

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] px-6 text-center">
      <Image
        src="/logo/grain-logo.jpg"
        alt="grAIn"
        width={64}
        height={64}
        className="mb-6 rounded-xl"
      />
      <h1 className="text-8xl font-bold text-green-700">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-900">Page Not Found</h2>
      <p className="mt-2 max-w-md text-gray-500">
        The page you are looking for does not exist or has been moved. Please check the URL or return to the dashboard.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-md bg-green-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/auth/login"
          className="rounded-md border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to Login
        </Link>
      </div>
      <p className="mt-12 text-xs text-gray-400">grAIn Admin Dashboard · IT308</p>
    </main>
  )
}
