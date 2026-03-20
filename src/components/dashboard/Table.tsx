import React from 'react';
import Card from '@/components/ui/Card';

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
  actions?: (row: Record<string, any>) => React.ReactNode;
}

const Table: React.FC<TableProps> = ({ columns, data, actions }) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm text-gray-700">
                    {row[col.key] instanceof Date ? row[col.key].toLocaleDateString() : String(row[col.key])}
                  </td>
                ))}
                {actions && <td className="px-6 py-4 text-sm">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </Card>
  );
};

export default Table;
