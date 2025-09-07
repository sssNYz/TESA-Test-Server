import mqtt, { MqttClient } from 'mqtt';
import { validateMQTTPayload } from './validation';
import { CameraRingBufferManager } from './ringBuffer';
import { BatchInserter } from './batchInserter';
import { NormalizedPayload, RingBufferFrame } from './types';

export class MQTTConsumer {
  private client: MqttClient | null = null;
  private ringBufferManager: CameraRingBufferManager;
  private batchInserter: BatchInserter;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;

  // Metrics
  private acceptedCount: number = 0;
  private rejectedCount: number = 0;

  constructor(
    ringBufferManager: CameraRingBufferManager,
    batchInserter: BatchInserter
  ) {
    this.ringBufferManager = ringBufferManager;
    this.batchInserter = batchInserter;
  }

  async connect(): Promise<void> {
    const mqttHost = process.env.MQTT_HOST || 'localhost';
    const mqttPort = parseInt(process.env.MQTT_PORT || '1883');
    const mqttTopic = process.env.MQTT_TOPIC || 'drone/detections/#';

    const brokerUrl = `mqtt://${mqttHost}:${mqttPort}`;

    try {
      console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);
      
      this.client = mqtt.connect(brokerUrl, {
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 0, // We handle reconnection manually
      });

      this.setupEventHandlers(mqttTopic);
      
    } catch (error) {
      console.error('❌ MQTT connection failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(mqttTopic: string): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Subscribe to topic
      this.client!.subscribe(mqttTopic, (err) => {
        if (err) {
          console.error('❌ MQTT subscription failed:', err);
        } else {
          console.log(`📡 Subscribed to topic: ${mqttTopic}`);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      this.isConnected = false;
      this.handleReconnection();
    });

    this.client.on('offline', () => {
      console.log('📡 MQTT client offline');
      this.isConnected = false;
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      const validation = validateMQTTPayload(payload, topic);

      if (!validation.isValid) {
        this.rejectedCount++;
        console.warn(`❌ Invalid payload from ${topic}:`, validation.errors);
        return;
      }

      this.acceptedCount++;
      const normalizedPayload = validation.normalizedPayload!;

      // Create ring buffer frame
      const frame: RingBufferFrame = {
        cameraId: normalizedPayload.cameraId,
        ts: normalizedPayload.ts,
        recvTs: normalizedPayload.recvTs,
        detected: normalizedPayload.detected,
        count: normalizedPayload.count,
        objects: normalizedPayload.objects,
      };

      // Push to ring buffer
      this.ringBufferManager.pushFrame(normalizedPayload.cameraId, frame);

      // Stage for batch insert
      this.batchInserter.stageForInsert(normalizedPayload);

      // Log every 100th message to avoid spam
      if (this.acceptedCount % 100 === 0) {
        console.log(`📊 Processed ${this.acceptedCount} messages, rejected ${this.rejectedCount}`);
      }

    } catch (error) {
      this.rejectedCount++;
      console.error(`❌ Error processing message from ${topic}:`, error);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping MQTT consumer.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('❌ Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('🔌 Disconnecting MQTT client...');
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          console.log('✅ MQTT client disconnected');
          resolve();
        });
      });
      this.client = null;
      this.isConnected = false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getMetrics(): { accepted: number; rejected: number } {
    return {
      accepted: this.acceptedCount,
      rejected: this.rejectedCount,
    };
  }

  resetMetrics(): void {
    this.acceptedCount = 0;
    this.rejectedCount = 0;
  }
}
