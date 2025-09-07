'use client';

import { EventLogEntry } from '@/lib/frontend-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EventLogProps {
  events: EventLogEntry[];
  maxEvents?: number;
  className?: string;
}

export default function EventLog({ 
  events, 
  maxEvents = 10, 
  className = '' 
}: EventLogProps) {
  const recentEvents = events.slice(-maxEvents).reverse();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Event Log</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recent detection events (last {maxEvents})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No events yet
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <div 
                key={`${event.timestamp}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  
                  <Badge variant={event.detected ? 'default' : 'secondary'}>
                    {event.detected ? 'DETECTED' : 'CLEAR'}
                  </Badge>
                  
                  {event.detected && (
                    <span className="text-gray-700 dark:text-gray-300">
                      {event.count} drone{event.count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {event.detected && event.maxConfidence > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getConfidenceColor(event.maxConfidence)}`}></div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {Math.round(event.maxConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
