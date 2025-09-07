'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DetectionData, ConnectionStatus, CameraInfo, EventLogEntry } from '@/lib/frontend-types';
import { SSEClient } from '@/lib/sse-client';
import LiveView from '@/components/LiveView';
import StatusBar from '@/components/StatusBar';
import CameraSelector from '@/components/CameraSelector';
import EventLog from '@/components/EventLog';

export default function Dashboard() {
  const [selectedCameraId, setSelectedCameraId] = useState('cam-01');
  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0
  });
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [cameras] = useState<CameraInfo[]>([
    { id: 'cam-01', name: 'Camera 1', isActive: true },
    { id: 'cam-02', name: 'Camera 2', isActive: true },
    { id: 'cam-03', name: 'Camera 3', isActive: false },
  ]);

  const sseClientRef = useRef<SSEClient | null>(null);

  // Add event to log
  const addEventToLog = useCallback((data: DetectionData) => {
    const maxConfidence = data.detected && data.objects.length > 0 
      ? Math.max(...data.objects.map(obj => obj.confidence))
      : 0;

    const newEvent: EventLogEntry = {
      timestamp: data.ts,
      count: data.count,
      maxConfidence,
      detected: data.detected
    };

    setEventLog(prev => [...prev, newEvent].slice(-50)); // Keep last 50 events
  }, []);

  // Handle SSE messages
  const handleSSEMessage = useCallback((data: DetectionData) => {
    setDetectionData(data);
    addEventToLog(data);
  }, [addEventToLog]);

  // Handle connection status changes
  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  // Initialize SSE client
  const initializeSSE = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
    }

    const client = new SSEClient(selectedCameraId);
    client.onMessage = handleSSEMessage;
    client.onStatusChange = handleStatusChange;
    client.connect();

    sseClientRef.current = client;
  }, [selectedCameraId, handleSSEMessage, handleStatusChange]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const response = await fetch(`/api/latest?camera_id=${encodeURIComponent(selectedCameraId)}`);
      if (response.ok) {
        const data: DetectionData = await response.json();
        setDetectionData(data);
        addEventToLog(data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }, [selectedCameraId, addEventToLog]);

  // Handle camera change
  const handleCameraChange = useCallback((newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (sseClientRef.current) {
      sseClientRef.current.changeCamera(newCameraId);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadInitialData();
    initializeSSE();

    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
      }
    };
  }, [loadInitialData, initializeSSE]);

  // Re-initialize when camera changes
  useEffect(() => {
    if (sseClientRef.current) {
      initializeSSE();
    }
  }, [selectedCameraId, initializeSSE]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚁 Drone Detection Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring and visualization of drone detection data
          </p>
        </header>

        {/* Camera Selector */}
        <CameraSelector
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onCameraChange={handleCameraChange}
          className="mb-6"
        />

        {/* Status Bar */}
        <StatusBar
          connectionStatus={connectionStatus}
          detectionData={detectionData}
          className="mb-6"
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live View */}
          <div className="lg:col-span-2">
            <LiveView
              detectionData={detectionData}
              width={800}
              height={600}
              className="w-full"
            />
          </div>

          {/* Event Log */}
          <div className="lg:col-span-1">
            <EventLog
              events={eventLog}
              maxEvents={10}
              className="h-full"
            />
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Debug Information
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>Camera ID: {selectedCameraId}</div>
            <div>Connection: {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Last Update: {detectionData ? new Date(detectionData.ts).toLocaleTimeString() : 'None'}</div>
            <div>Events Logged: {eventLog.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
