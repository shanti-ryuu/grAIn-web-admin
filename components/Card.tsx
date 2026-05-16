import type { ReactNode } from 'react'

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

export interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ children, className = '', padding }: CardProps) {
  return (
    <div className={`stat-card ${padding ? paddingClasses[padding] : 'p-0'} ${className}`}>
      {children}
    </div>
  )
}
