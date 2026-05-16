import type { Metadata } from 'next'
import DeviceDetailPageClient from './DeviceDetailPageClient'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  return { title: `Device ${id}` }
}

export default function DeviceDetailPage() {
  return <DeviceDetailPageClient />
}
