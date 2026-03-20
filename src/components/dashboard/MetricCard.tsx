import React from 'react';
import Card from '@/components/ui/Card';
import { TrendUpIcon, TrendDownIcon } from '@/components/icons';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: IconComponent, trend }) => {
  return (
    <Card className="p-6 md:p-8 flex flex-col h-full group hover:bg-gradient-to-br hover:from-white hover:to-emerald-50" variant="elevated">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-gray-500 text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">{label}</p>
          <p className="text-4xl md:text-5xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 md:p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl ml-4 group-hover:shadow-lg transition-all duration-300">
          <IconComponent size={32} color="#10b981" />
        </div>
      </div>
      {trend && (
        <div className={`text-xs md:text-sm mt-auto flex items-center space-x-1.5 font-semibold py-2 px-3 rounded-lg inline-fit w-fit ${
          trend.direction === 'up'
            ? 'text-emerald-700 bg-emerald-50'
            : 'text-red-700 bg-red-50'
        }`}>
          {trend.direction === 'up' ? (
            <TrendUpIcon size={16} color="currentColor" />
          ) : (
            <TrendDownIcon size={16} color="currentColor" />
          )}
          <span>{trend.value}%</span>
          <span className="text-xs text-gray-600">vs last month</span>
        </div>
      )}
    </Card>
  );
};

export default MetricCard;
