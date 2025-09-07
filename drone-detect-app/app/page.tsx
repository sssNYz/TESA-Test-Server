'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [serverStatus, setServerStatus] = useState<'loading' | 'running' | 'error'>('loading');
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    // Check server health
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setHealthData(data);
          setServerStatus('running');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setServerStatus('error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🚁 Drone Detection Server
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Real-time MQTT data processing with MySQL storage and SSE streaming
          </p>
          <a 
            href="/dashboard" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Open Dashboard →
          </a>
        </header>

        {/* Server Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Server Status
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${
              serverStatus === 'running' ? 'bg-green-500' : 
              serverStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-lg font-medium">
              {serverStatus === 'running' ? '🟢 Running' : 
               serverStatus === 'error' ? '🔴 Error' : '🟡 Loading...'}
            </span>
          </div>
          
          {healthData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">MQTT Messages</h3>
                <p className="text-2xl font-bold text-green-600">{healthData.metrics?.acceptedCount || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accepted</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">Rejected</h3>
                <p className="text-2xl font-bold text-red-600">{healthData.metrics?.rejectedCount || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Invalid Messages</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">Queue Size</h3>
                <p className="text-2xl font-bold text-blue-600">{healthData.metrics?.queueSize || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Inserts</p>
              </div>
            </div>
          )}
        </div>

        {/* API Endpoints */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Available Endpoints
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Live Stream (SSE)</h3>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                GET /api/stream?camera_id=cam-01
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time Server-Sent Events stream for live drone detection data
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Latest Detection</h3>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                GET /api/latest?camera_id=cam-01
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get the most recent detection for a specific camera
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">History Query</h3>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                GET /api/history?camera_id=cam-01&from=1757183600000&to=1757183660000&limit=2000
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Query historical detection data within a time range
              </p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Health Metrics</h3>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                GET /api/health
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Server health status and performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Ring Buffer Status */}
        {healthData?.ringBuffers && healthData.ringBuffers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Ring Buffers
            </h2>
            <div className="space-y-2">
              {healthData.ringBuffers.map((buffer: any) => (
                <div key={buffer.cameraId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="font-medium">{buffer.cameraId}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {buffer.size}/{buffer.capacity} frames
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
