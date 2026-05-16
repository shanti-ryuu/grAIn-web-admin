import type { ReactNode } from 'react'

export type DataTableColumn<T extends Record<string, unknown>> = {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T) => ReactNode
}

export type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  empty?: string
}

function renderCellValue(value: unknown): ReactNode {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value
  }

  return String(value)
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  empty = 'No data available',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#6b7280]">{empty}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-6 py-3 font-medium text-[#6b7280] text-xs uppercase tracking-wide"
                style={{ textAlign: col.align }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors duration-200"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4" style={{ textAlign: col.align }}>
                  {col.render ? col.render(row[col.key], row) : renderCellValue(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
