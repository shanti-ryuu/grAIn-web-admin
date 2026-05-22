import type { ReactNode } from 'react'
import Card from './Card'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  isLoading?: boolean
  className?: string
}

export default function ChartCard({
  title,
  children,
  description,
  isLoading = false,
  className = '',
}: Readonly<ChartCardProps>) {
  return (
    <Card className={`p-8 h-full glass-card ${className}`}>
      <div className="mb-8 pb-6 border-b-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="w-full h-80 flex items-center justify-center">
        {isLoading ? <div className="h-full w-full rounded-lg bg-gray-100 animate-pulse" /> : children}
      </div>
    </Card>
  )
}
