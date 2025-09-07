// TypeScript types for MQTT payloads and database operations

export interface DetectionObject {
  confidence: number;
  center: [number, number];
  bbox: [number, number, number, number]; // [x, y, width, height]
  area: number;
}

export interface MQTTPayload {
  ts: number;
  detected: boolean;
  count: number;
  objects: DetectionObject[];
}

export interface NormalizedPayload extends MQTTPayload {
  cameraId: string;
  recvTs: number;
}

export interface DetectionRaw {
  id?: bigint;
  cameraId: string;
  ts: number;
  recvTs: number;
  count: number;
  payload: MQTTPayload;
  msgKey?: string;
}

export interface DetectionObjectDB {
  id?: bigint;
  cameraId: string;
  ts: number;
  objectIdx: number;
  confidence?: number;
  centerX?: number;
  centerY?: number;
  bboxX?: number;
  bboxY?: number;
  bboxW?: number;
  bboxH?: number;
  area?: number;
}

export interface RingBufferFrame {
  cameraId: string;
  ts: number;
  recvTs: number;
  detected: boolean;
  count: number;
  objects: DetectionObject[];
}

export interface SSEMessage {
  camera_id: string;
  ts: number;
  detected: boolean;
  count: number;
  objects: DetectionObject[];
  server_recv_ts: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedPayload?: NormalizedPayload;
}

export interface BatchInsertData {
  cameraId: string;
  ts: number;
  recvTs: number;
  count: number;
  payload: MQTTPayload;
  msgKey?: string;
}

export interface HealthMetrics {
  sseClientsConnected: number;
  lastBatchDuration: number;
  queueSize: number;
  rejectedCount: number;
  acceptedCount: number;
  lastInsertLatency: number;
}
