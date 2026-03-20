import React from 'react';
import Card from '@/components/ui/Card';

interface DataPoint {
  label: string;
  value: number;
}

interface SimpleChartProps {
  title: string;
  data: DataPoint[];
  maxValue?: number;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ title, data, maxValue }) => {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <Card className="p-6 md:p-8" variant="elevated">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-7">{title}</h3>
      <div className="space-y-5">
        {data.map((point, idx) => (
          <div key={point.label} className="group">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm md:text-base font-semibold text-gray-700">{point.label}</span>
              <span className="text-xs md:text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg group-hover:bg-emerald-200 transition-colors">
                {point.value.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-sm">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{
                  width: `${(point.value / max) * 100}%`,
                  animation: `slideIn 0.8s ease-out ${idx * 0.1}s both`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            width: 0 !important;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </Card>
  );
};

export default SimpleChart;
