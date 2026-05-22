import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found | grAIn Admin',
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Logo */}
      <Image
        src="/logo/grain-logo.jpg"
        alt="grAIn"
        width={64}
        height={64}
        className="mb-6 rounded-xl"
      />

      {/* 404 number */}
      <h1 className="text-8xl font-bold text-primary">404</h1>

      {/* Message */}
      <h2 className="mt-4 text-2xl font-semibold text-gray-900">
        Page Not Found
      </h2>
      <p className="mt-2 max-w-md text-gray-500">
        The page you are looking for does not exist or has been moved.
        Please check the URL or return to the dashboard.
      </p>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/auth/login"
          className="rounded-md border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Login
        </Link>
      </div>

      {/* Footer note */}
      <p className="mt-12 text-xs text-gray-400">
        grAIn Admin Dashboard · IT308
      </p>
    </div>
  );
}
