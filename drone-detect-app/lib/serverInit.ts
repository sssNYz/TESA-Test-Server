import { connectDatabase } from './db';
import { CameraRingBufferManager } from './ringBuffer';
import { BatchInserter } from './batchInserter';
import { MQTTConsumer } from './mqttConsumer';

// Global instances
let ringBufferManager: CameraRingBufferManager;
let batchInserter: BatchInserter;
let mqttConsumer: MQTTConsumer;
let isInitialized: boolean = false;

export async function initializeServer(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('🚀 Initializing drone detection server...');

    // Connect to database
    await connectDatabase();

    // Initialize components
    ringBufferManager = new CameraRingBufferManager();
    batchInserter = new BatchInserter();
    mqttConsumer = new MQTTConsumer(ringBufferManager, batchInserter);

    // Start batch inserter
    batchInserter.start();

    // Connect to MQTT
    await mqttConsumer.connect();

    isInitialized = true;
    console.log('✅ Server initialized successfully');

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    throw error;
  }
}

export function getRingBufferManager(): CameraRingBufferManager {
  if (!ringBufferManager) {
    throw new Error('Server not initialized. Call initializeServer() first.');
  }
  return ringBufferManager;
}

export function getBatchInserter(): BatchInserter {
  if (!batchInserter) {
    throw new Error('Server not initialized. Call initializeServer() first.');
  }
  return batchInserter;
}

export function getMQTTConsumer(): MQTTConsumer {
  if (!mqttConsumer) {
    throw new Error('Server not initialized. Call initializeServer() first.');
  }
  return mqttConsumer;
}

export function isServerInitialized(): boolean {
  return isInitialized;
}
