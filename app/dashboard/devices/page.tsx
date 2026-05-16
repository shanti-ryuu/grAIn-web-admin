import type { Metadata } from 'next'
import DevicesPageClient from './DevicesPageClient'

export const metadata: Metadata = { title: 'Devices' }

export default function DevicesPage() {
  return <DevicesPageClient />
}
