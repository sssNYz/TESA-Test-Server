import { NextResponse } from 'next/server';
import { HealthMetrics } from '@/lib/types';
import { initializeServer, getRingBufferManager, getBatchInserter, getMQTTConsumer, isServerInitialized } from '@/lib/serverInit';

export async function GET() {
  try {
    // Initialize server if not already done
    if (!isServerInitialized()) {
      await initializeServer();
    }

    const ringBufferManager = getRingBufferManager();
    const batchInserter = getBatchInserter();
    const mqttConsumer = getMQTTConsumer();

    const metrics: HealthMetrics = {
      sseClientsConnected: 0, // Will be updated when SSE manager is implemented
      lastBatchDuration: 0,
      queueSize: 0,
      rejectedCount: 0,
      acceptedCount: 0,
      lastInsertLatency: 0,
    };

    // Get MQTT metrics
    const mqttMetrics = mqttConsumer.getMetrics();
    metrics.acceptedCount = mqttMetrics.accepted;
    metrics.rejectedCount = mqttMetrics.rejected;

    // Get batch inserter metrics
    const batchMetrics = batchInserter.getMetrics();
    metrics.queueSize = batchMetrics.queueSize;
    metrics.lastBatchDuration = batchMetrics.lastFlushDuration;
    metrics.lastInsertLatency = batchMetrics.lastFlushDuration;

    // Get ring buffer stats
    const bufferStats = ringBufferManager.getBufferStats();

    const response = {
      status: 'healthy',
      timestamp: Date.now(),
      metrics,
      ringBuffers: bufferStats,
      uptime: process.uptime(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in health endpoint:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
