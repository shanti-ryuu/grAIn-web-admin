'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type ToastVariant } from '@/hooks/useToast'

const variantConfig: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />,
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
  },
}

interface ToastItemProps {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

function ToastItem({ id, title, description, variant = 'success' }: ToastItemProps) {
  const dismiss = useToastStore((state) => state.dismiss)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const config = variantConfig[variant]

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => dismiss(id), 300)
  }

  const ariaLive = variant === 'error' ? 'assertive' : 'polite'

  const animClass = isExiting
    ? 'translate-x-full opacity-0'
    : isVisible
      ? 'translate-x-0 opacity-100'
      : 'translate-x-full opacity-0'

  return (
    <div
      role="alert"
      aria-live={ariaLive}
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out ${config.container} ${animClass}`}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-gray-900">{title}</p>}
        {description && <p className="text-sm text-gray-600 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
        />
      ))}
    </div>
  )
}
