import type { Metadata } from 'next'
import UsersPageClient from './UsersPageClient'

export const metadata: Metadata = { title: 'User Management' }

export default function UsersPage() {
  return <UsersPageClient />
}
