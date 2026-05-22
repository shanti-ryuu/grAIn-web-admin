'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const APP_NAME = 'grAIn Admin'

const pageTitles: Record<string, string> = {
  '/': 'Login',
  '/auth/login': 'Login',
  '/dashboard': 'Dashboard',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/devices': 'Devices',
  '/dashboard/profile': 'Profile',
  '/dashboard/reports': 'Reports',
  '/dashboard/sessions': 'Drying Sessions',
  '/dashboard/settings': 'Settings',
  '/dashboard/users': 'Users',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard/devices/')) return `Device Details | ${APP_NAME}`

  const title = pageTitles[pathname] ?? 'Dashboard'
  return `${title} | ${APP_NAME}`
}

export default function PageTitle() {
  const pathname = usePathname()

  useEffect(() => {
    document.title = getPageTitle(pathname)
  }, [pathname])

  return null
}
