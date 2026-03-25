interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: MetricCardProps) {
  return (
    <div className="bg-[#ffffff] rounded-lg border border-[#e5e7eb] p-6 hover:border-[#166534] transition-colors duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-[#6b7280] font-medium">{title}</p>
        </div>
        {icon && <div className="text-[#6b7280]">{icon}</div>}
      </div>

      <div className="mb-2">
        <h3 className="text-4xl font-bold text-[#111827] tracking-tight">{value}</h3>
      </div>

      <div className="flex items-center justify-between">
        {subtitle && <p className="text-xs text-[#6b7280]">{subtitle}</p>}
        {trend && (
          <div
            className={`text-xs font-semibold flex items-center gap-1 ${
              trend.isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  )
}
