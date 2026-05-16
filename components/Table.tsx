import type { ReactNode } from 'react'
import Card from './Card'

export interface TableColumn<T extends Record<string, unknown>> {
  key: string
  label: string
  render?(value: unknown, row: T): ReactNode
  className?: string
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[]
  data: T[]
  title?: string
  className?: string
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

export default function Table<T extends Record<string, unknown>>({ columns, data, title, className = '' }: TableProps<T>) {
  return (
    <Card className={className}>
      {title && <div className="px-6 pt-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td 
                      key={col.key} 
                    className={`px-6 py-4 text-sm text-gray-900 ${col.className ?? ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : renderCellValue(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
