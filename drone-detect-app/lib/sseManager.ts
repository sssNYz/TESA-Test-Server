import { NextRequest } from 'next/server';
import { CameraRingBufferManager } from './ringBuffer';
import { SSEMessage } from './types';

export class SSEManager {
  private clients: Map<string, Set<Response>> = new Map();
  private ringBufferManager: CameraRingBufferManager;
  private pushInterval: NodeJS.Timeout | null = null;
  private readonly pushIntervalMs: number;
  private isRunning: boolean = false;

  constructor(ringBufferManager: CameraRingBufferManager) {
    this.ringBufferManager = ringBufferManager;
    this.pushIntervalMs = parseInt(process.env.STREAM_PUSH_INTERVAL_MS || '150');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ SSE manager already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting SSE manager (push every ${this.pushIntervalMs}ms)`);

    // Set up periodic push to all clients
    this.pushInterval = setInterval(() => {
      this.pushToAllClients();
    }, this.pushIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 Stopping SSE manager...');

    if (this.pushInterval) {
      clearInterval(this.pushInterval);
      this.pushInterval = null;
    }

    // Close all connections
    this.closeAllConnections();
  }

  addClient(cameraId: string, response: Response): void {
    if (!this.clients.has(cameraId)) {
      this.clients.set(cameraId, new Set());
    }
    this.clients.get(cameraId)!.add(response);

    console.log(`📡 SSE client connected for camera ${cameraId} (total: ${this.getClientCount()})`);
  }

  removeClient(cameraId: string, response: Response): void {
    const cameraClients = this.clients.get(cameraId);
    if (cameraClients) {
      cameraClients.delete(response);
      if (cameraClients.size === 0) {
        this.clients.delete(cameraId);
      }
    }

    console.log(`📡 SSE client disconnected for camera ${cameraId} (total: ${this.getClientCount()})`);
  }

  private pushToAllClients(): void {
    for (const [cameraId, clients] of this.clients.entries()) {
      const latestFrame = this.ringBufferManager.getLatestFrame(cameraId);
      
      if (latestFrame) {
        const sseMessage: SSEMessage = {
          camera_id: cameraId,
          ts: latestFrame.ts,
          detected: latestFrame.detected,
          count: latestFrame.count,
          objects: latestFrame.objects,
          server_recv_ts: latestFrame.recvTs,
        };

        this.pushToCameraClients(cameraId, sseMessage);
      }
    }

    // Send heartbeat every ~15 seconds
    if (Date.now() % 15000 < this.pushIntervalMs) {
      this.sendHeartbeat();
    }
  }

  private pushToCameraClients(cameraId: string, message: SSEMessage): void {
    const clients = this.clients.get(cameraId);
    if (!clients || clients.size === 0) {
      return;
    }

    const sseData = `data: ${JSON.stringify(message)}\n\n`;
    const deadClients: Response[] = [];

    for (const client of clients) {
      try {
        // Note: In a real implementation, you'd need to handle the Response object differently
        // This is a simplified version for demonstration
        console.log(`📤 Pushing to camera ${cameraId}:`, message);
      } catch (error) {
        console.error('❌ Error pushing to SSE client:', error);
        deadClients.push(client);
      }
    }

    // Remove dead clients
    deadClients.forEach(client => {
      this.removeClient(cameraId, client);
    });
  }

  private sendHeartbeat(): void {
    const heartbeat = ': ping\n\n';
    
    for (const [cameraId, clients] of this.clients.entries()) {
      const deadClients: Response[] = [];
      
      for (const client of clients) {
        try {
          console.log(`💓 Heartbeat to camera ${cameraId}`);
        } catch (error) {
          deadClients.push(client);
        }
      }

      deadClients.forEach(client => {
        this.removeClient(cameraId, client);
      });
    }
  }

  private closeAllConnections(): void {
    for (const [cameraId, clients] of this.clients.entries()) {
      for (const client of clients) {
        try {
          // Close connection
          console.log(`🔌 Closing SSE connection for camera ${cameraId}`);
        } catch (error) {
          console.error('❌ Error closing SSE connection:', error);
        }
      }
    }
    this.clients.clear();
  }

  getClientCount(): number {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.size;
    }
    return total;
  }

  getCameraClientCounts(): { cameraId: string; count: number }[] {
    return Array.from(this.clients.entries()).map(([cameraId, clients]) => ({
      cameraId,
      count: clients.size,
    }));
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Helper function to create SSE response
export function createSSEResponse(): Response {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  return new Response(null, { headers });
}

// Helper function to write SSE data
export function writeSSEData(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Helper function to write SSE comment (heartbeat)
export function writeSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}
