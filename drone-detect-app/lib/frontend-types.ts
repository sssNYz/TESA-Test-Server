// Frontend-specific types for drone detection visualization

export interface DetectionData {
  camera_id: string;
  ts: number;
  detected: boolean;
  count: number;
  objects: DetectionObject[];
  server_recv_ts: number;
}

export interface DetectionObject {
  confidence: number;
  center: [number, number]; // [x, y] normalized coordinates (0-1)
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  area: number;
}

export interface HistoryData {
  camera_id: string;
  ts: number;
  detected: boolean;
  count: number;
  objects: DetectionObject[];
  server_recv_ts: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastError?: string;
  reconnectAttempts: number;
}

export interface RenderFrame {
  detectionData: DetectionData | null;
  timestamp: number;
  latency: number;
}

export interface CameraInfo {
  id: string;
  name: string;
  isActive: boolean;
}

export interface EventLogEntry {
  timestamp: number;
  count: number;
  maxConfidence: number;
  detected: boolean;
}
