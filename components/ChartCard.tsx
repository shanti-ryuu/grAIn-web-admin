import Card from './Card'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  description?: string
}

export default function ChartCard({
  title,
  children,
  description,
}: ChartCardProps) {
  return (
    <Card className="p-8 h-full glass-card">
      <div className="mb-8 pb-6 border-b-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="w-full h-80 flex items-center justify-center">
        {children}
      </div>
    </Card>
  )
}
