import type { Metadata } from 'next'
import SessionsPageClient from './SessionsPageClient'

export const metadata: Metadata = { title: 'Drying Sessions' }

export default function SessionsPage() {
  return <SessionsPageClient />
}
