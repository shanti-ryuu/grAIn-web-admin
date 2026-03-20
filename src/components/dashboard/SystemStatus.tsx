import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface SystemStatusProps {
  status: 'online' | 'offline';
  lastChecked?: Date;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ status, lastChecked }) => {
  const isOnline = status === 'online';

  return (
    <Card className="p-8 md:p-10 flex flex-col items-center justify-center py-12 md:py-14 bg-gradient-to-br from-emerald-50 to-white border border-emerald-200" variant="default">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div
            className={`w-5 h-5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50'}`}
          />
          {isOnline && (
            <div className="absolute inset-0 w-5 h-5 rounded-full bg-emerald-400 opacity-0 animate-ping"></div>
          )}
        </div>
        <Badge variant={isOnline ? 'success' : 'danger'} className="text-sm md:text-base px-4 py-2 font-semibold">
          {isOnline ? '✓ System Online' : '✗ System Offline'}
        </Badge>
      </div>
      <p className="text-gray-600 text-xs md:text-sm text-center mt-6">
        {lastChecked ? (
          <>
            <span className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Last Updated</span>
            <span className="font-mono text-lg font-bold text-emerald-700">{lastChecked.toLocaleTimeString()}</span>
          </>
        ) : (
          'Initializing system...'
        )}
      </p>
    </Card>
  );
};

export default SystemStatus;
