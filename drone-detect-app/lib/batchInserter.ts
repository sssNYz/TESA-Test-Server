import { batchInsertDetections } from './db';
import { NormalizedPayload, BatchInsertData } from './types';

export class BatchInserter {
  private batchQueue: BatchInsertData[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly maxQueueSize: number = 1000; // Prevent memory overflow
  private isRunning: boolean = false;

  // Metrics
  private totalInserted: number = 0;
  private totalErrors: number = 0;
  private lastFlushDuration: number = 0;

  constructor() {
    this.flushIntervalMs = parseInt(process.env.BATCH_FLUSH_MS || '150');
    this.maxBatchSize = parseInt(process.env.BATCH_MAX_ROWS || '200');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Batch inserter already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting batch inserter (flush every ${this.flushIntervalMs}ms, max ${this.maxBatchSize} rows)`);

    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flushBatch();
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 Stopping batch inserter...');

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining data
    this.flushBatch();
  }

  stageForInsert(payload: NormalizedPayload): void {
    const batchData: BatchInsertData = {
      cameraId: payload.cameraId,
      ts: payload.ts,
      recvTs: payload.recvTs,
      count: payload.count,
      payload: {
        ts: payload.ts,
        detected: payload.detected,
        count: payload.count,
        objects: payload.objects,
      },
      // msgKey: payload.msgKey, // For QoS1 support later
    };

    this.batchQueue.push(batchData);

    // Check if we need to flush immediately
    if (this.batchQueue.length >= this.maxBatchSize) {
      this.flushBatch();
    }

    // Prevent memory overflow
    if (this.batchQueue.length > this.maxQueueSize) {
      const droppedCount = this.batchQueue.length - this.maxQueueSize;
      this.batchQueue = this.batchQueue.slice(-this.maxQueueSize);
      console.warn(`⚠️ Dropped ${droppedCount} items due to queue overflow`);
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const batchToInsert = [...this.batchQueue];
    this.batchQueue = [];

    if (batchToInsert.length === 0) {
      return;
    }

    try {
      const startTime = Date.now();
      const insertedCount = await batchInsertDetections(batchToInsert);
      const duration = Date.now() - startTime;

      this.lastFlushDuration = duration;
      this.totalInserted += insertedCount;

      console.log(`📊 Batch flush: ${insertedCount}/${batchToInsert.length} rows in ${duration}ms`);

    } catch (error) {
      this.totalErrors++;
      console.error('❌ Batch insert failed:', error);
      
      // In case of error, we could implement retry logic here
      // For now, we just log the error and continue
    }
  }

  getQueueSize(): number {
    return this.batchQueue.length;
  }

  getMetrics(): {
    queueSize: number;
    totalInserted: number;
    totalErrors: number;
    lastFlushDuration: number;
  } {
    return {
      queueSize: this.batchQueue.length,
      totalInserted: this.totalInserted,
      totalErrors: this.totalErrors,
      lastFlushDuration: this.lastFlushDuration,
    };
  }

  resetMetrics(): void {
    this.totalInserted = 0;
    this.totalErrors = 0;
    this.lastFlushDuration = 0;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
