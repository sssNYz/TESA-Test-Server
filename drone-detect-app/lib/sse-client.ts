// SSE client with auto-reconnect functionality for drone detection stream

import { DetectionData, ConnectionStatus } from './frontend-types';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private cameraId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  public onMessage: ((data: DetectionData) => void) | null = null;
  public onStatusChange: ((status: ConnectionStatus) => void) | null = null;

  constructor(cameraId: string) {
    this.cameraId = cameraId;
  }

  public connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.isManualClose = false;
    this.updateStatus({ isConnected: false, isConnecting: true, reconnectAttempts: this.reconnectAttempts });

    try {
      const url = `/api/stream?camera_id=${encodeURIComponent(this.cameraId)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log(`SSE connected for camera ${this.cameraId}`);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.updateStatus({ 
          isConnected: true, 
          isConnecting: false, 
          reconnectAttempts: 0 
        });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: DetectionData = JSON.parse(event.data);
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.handleReconnect();
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.handleReconnect();
    }
  }

  public disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStatus({ 
      isConnected: false, 
      isConnecting: false, 
      reconnectAttempts: this.reconnectAttempts 
    });
  }

  public changeCamera(newCameraId: string): void {
    this.cameraId = newCameraId;
    this.disconnect();
    this.connect();
  }

  private handleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus({ 
        isConnected: false, 
        isConnecting: false, 
        reconnectAttempts: this.reconnectAttempts,
        lastError: this.reconnectAttempts >= this.maxReconnectAttempts 
          ? 'Max reconnect attempts reached' 
          : 'Connection closed'
      });
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus({ 
      isConnected: false, 
      isConnecting: true, 
      reconnectAttempts: this.reconnectAttempts,
      lastError: `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    });

    // Exponential backoff with jitter
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    const jitter = Math.random() * 1000;
    const totalDelay = delay + jitter;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, totalDelay);
  }

  private updateStatus(status: ConnectionStatus): void {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  public getCameraId(): string {
    return this.cameraId;
  }

  public isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
