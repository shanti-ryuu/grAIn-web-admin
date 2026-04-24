'use client'

import { useToast } from '@/hooks/useToast'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm animate-in slide-in-from-right ${
            t.variant === 'destructive'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <div className="flex-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-xs mt-1 text-gray-600">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
