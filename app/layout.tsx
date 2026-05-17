import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ToastContainer } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'grAIn Admin Dashboard',
  description: 'AI-assisted IoT Solar-Powered Rice Grain Dryer system administration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#f9fafb] antialiased font-sans">
        <Providers>{children}</Providers>
        <ToastContainer />
      </body>
    </html>
  )
}
