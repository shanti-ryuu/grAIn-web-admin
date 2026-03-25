import { LucideIcon } from 'lucide-react'
import Card from './Card'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

export default function StatCard({
  icon: Icon,
  label,
  value,
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
    <Card className="p-7 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-default">
      <div className="flex items-start justify-between mb-6">
        {/* Left: Labels and Value */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium mb-3">{label}</p>
          <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
        </div>

        {/* Right: Icon */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl flex-shrink-0 ml-4 group-hover:shadow-md transition-shadow">
          <Icon className="w-6 h-6 text-green-600" />
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
