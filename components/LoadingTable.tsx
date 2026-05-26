import { Skeleton } from '@/components/ui/skeleton'

interface LoadingTableProps {
  rows?: number
  cols?: number
}

export function LoadingTable({ rows = 5, cols = 5 }: LoadingTableProps) {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
