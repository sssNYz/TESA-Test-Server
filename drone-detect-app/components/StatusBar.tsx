'use client';

import { ConnectionStatus, DetectionData } from '@/lib/frontend-types';
import { Badge } from '@/components/ui/badge';

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
  detectionData: DetectionData | null;
  className?: string;
}

export default function StatusBar({ 
  connectionStatus, 
  detectionData, 
  className = '' 
}: StatusBarProps) {
  const getConnectionStatusColor = () => {
    if (connectionStatus.isConnected) return 'bg-green-500';
    if (connectionStatus.isConnecting) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConnectionStatusText = () => {
    if (connectionStatus.isConnected) return 'LIVE';
    if (connectionStatus.isConnecting) return 'CONNECTING';
    return 'DISCONNECTED';
  };

  const getMaxConfidence = () => {
    if (!detectionData || !detectionData.detected || detectionData.objects.length === 0) {
      return 0;
    }
    return Math.max(...detectionData.objects.map(obj => obj.confidence));
  };

  const getLatency = () => {
    if (!detectionData) return 0;
    return Date.now() - detectionData.ts;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
          <span className="font-medium text-gray-900 dark:text-white">
            {getConnectionStatusText()}
          </span>
          {connectionStatus.reconnectAttempts > 0 && (
            <Badge variant="outline" className="text-xs">
              Retry {connectionStatus.reconnectAttempts}
            </Badge>
          )}
        </div>

        {/* Detection Stats */}
        <div className="flex items-center gap-6">
          {/* Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {detectionData?.count || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Detected
            </div>
          </div>

          {/* Max Confidence */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(getMaxConfidence() * 100)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Max Confidence
            </div>
          </div>

          {/* Latency */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {getLatency()}ms
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Latency
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {connectionStatus.lastError && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {connectionStatus.lastError}
        </div>
      )}
    </div>
  );
}
