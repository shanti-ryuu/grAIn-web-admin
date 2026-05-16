import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Card from './Card'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  unit?: string
  iconNode?: ReactNode
  colorClass?: string
  className?: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  iconNode,
  colorClass = 'text-green-600',
  className = '',
  change,
  changeType = 'neutral',
}: StatCardProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-green-600'
      : changeType === 'negative'
        ? 'text-red-500'
        : 'text-gray-500'

  return (
    <Card className={`p-7 hover:scale-[1.02] transition-all duration-300 group cursor-default ${className}`}>
      <div className="flex items-start justify-between mb-6">
        {/* Left: Labels and Value */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium mb-3">{label}</p>
          <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}{unit && <span className="text-base font-semibold text-gray-500 ml-1">{unit}</span>}</p>
        </div>

        {/* Right: Icon */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl flex-shrink-0 ml-4 group-hover:shadow-md transition-shadow">
          {iconNode ?? <Icon className={`w-6 h-6 ${colorClass}`} />}
        </div>
      </div>

      {/* Trend Indicator */}
      {change && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <span className={`text-xs font-semibold ${changeColor}`}>
            {change}
          </span>
        </div>
      )}
    </Card>
  )
}
