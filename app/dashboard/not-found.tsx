import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-bold text-primary/20">404</div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">Resource Not Found</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        The item you are looking for does not exist or you may not have
        permission to view it.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-md bg-primary px-5 py-2 text-sm text-white hover:bg-green-700 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
