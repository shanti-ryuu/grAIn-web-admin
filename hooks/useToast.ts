'use client'

import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

let toastCount = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: ({ title, description, variant = 'success', duration = 4000 }) => {
    const id = `toast-${toastCount++}`
    const newToast: Toast = { id, title, description, variant, duration }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  dismiss: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

export function useToast() {
  const addToast = useToastStore((state) => state.addToast)
  const dismiss = useToastStore((state) => state.dismiss)
  const toasts = useToastStore((state) => state.toasts)

  const toast = ({ title, description, variant = 'success', duration }: Omit<Toast, 'id'>) => {
    addToast({ title, description, variant, duration })
  }

  return {
    toast,
    toasts,
    dismiss,
  }
}
