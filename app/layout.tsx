import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from '@/components/Providers'
import { ToastContainer } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: {
    default: 'grAIn Admin',
    template: '%s | grAIn Admin',
  },
  description: 'IoT Smart Grain Dryer Monitoring & Control Dashboard — St. Dominic College of Asia',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
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
