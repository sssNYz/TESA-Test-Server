import { RingBufferFrame } from './types';

export class RingBuffer {
  private buffer: RingBufferFrame[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly capacity: number;
  private readonly maxAgeMs: number;

  constructor(capacity: number, maxAgeSeconds: number) {
    this.capacity = capacity;
    this.maxAgeMs = maxAgeSeconds * 1000;
    this.buffer = new Array(capacity);
  }

  push(frame: RingBufferFrame): void {
    // Clean old frames before adding new one
    this.cleanOldFrames();

    this.buffer[this.head] = frame;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  getLatest(): RingBufferFrame | null {
    if (this.size === 0) {
      return null;
    }
    
    const latestIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[latestIndex];
  }

  getAll(): RingBufferFrame[] {
    if (this.size === 0) {
      return [];
    }

    const frames: RingBufferFrame[] = [];
    let current = this.tail;
    
    for (let i = 0; i < this.size; i++) {
      frames.push(this.buffer[current]);
      current = (current + 1) % this.capacity;
    }
    
    return frames;
  }

  getRecent(seconds: number): RingBufferFrame[] {
    const cutoffTime = Date.now() - (seconds * 1000);
    return this.getAll().filter(frame => frame.recvTs >= cutoffTime);
  }

  private cleanOldFrames(): void {
    const cutoffTime = Date.now() - this.maxAgeMs;
    
    while (this.size > 0) {
      const oldestIndex = this.tail;
      const oldestFrame = this.buffer[oldestIndex];
      
      if (oldestFrame.recvTs < cutoffTime) {
        this.tail = (this.tail + 1) % this.capacity;
        this.size--;
      } else {
        break;
      }
    }
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
}

export class CameraRingBufferManager {
  private buffers: Map<string, RingBuffer> = new Map();
  private readonly bufferCapacity: number;
  private readonly maxAgeSeconds: number;

  constructor(bufferCapacity: number = 100, maxAgeSeconds: number = 10) {
    this.bufferCapacity = bufferCapacity;
    this.maxAgeSeconds = maxAgeSeconds;
  }

  getBuffer(cameraId: string): RingBuffer {
    if (!this.buffers.has(cameraId)) {
      this.buffers.set(cameraId, new RingBuffer(this.bufferCapacity, this.maxAgeSeconds));
    }
    return this.buffers.get(cameraId)!;
  }

  pushFrame(cameraId: string, frame: RingBufferFrame): void {
    const buffer = this.getBuffer(cameraId);
    buffer.push(frame);
  }

  getLatestFrame(cameraId: string): RingBufferFrame | null {
    const buffer = this.getBuffer(cameraId);
    return buffer.getLatest();
  }

  getAllFrames(cameraId: string): RingBufferFrame[] {
    const buffer = this.getBuffer(cameraId);
    return buffer.getAll();
  }

  getRecentFrames(cameraId: string, seconds: number): RingBufferFrame[] {
    const buffer = this.getBuffer(cameraId);
    return buffer.getRecent(seconds);
  }

  getAllCameraIds(): string[] {
    return Array.from(this.buffers.keys());
  }

  getBufferStats(): { cameraId: string; size: number; capacity: number }[] {
    return Array.from(this.buffers.entries()).map(([cameraId, buffer]) => ({
      cameraId,
      size: buffer.getSize(),
      capacity: buffer.getCapacity(),
    }));
  }

  clearBuffer(cameraId: string): void {
    const buffer = this.buffers.get(cameraId);
    if (buffer) {
      buffer.clear();
    }
  }

  clearAllBuffers(): void {
    this.buffers.clear();
  }
}
