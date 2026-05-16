import type { Metadata } from 'next'
import ReportsPageClient from './ReportsPageClient'

export const metadata: Metadata = { title: 'Reports' }

export default function ReportsPage() {
  return <ReportsPageClient />
}
