import type { Metadata } from 'next'
import ProfilePageClient from './ProfilePageClient'

export const metadata: Metadata = { title: 'My Profile' }

export default function ProfilePage() {
  return <ProfilePageClient />
}
