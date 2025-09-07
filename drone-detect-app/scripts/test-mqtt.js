#!/usr/bin/env node

/**
 * Test script to generate sample MQTT drone detection data
 * Usage: node scripts/test-mqtt.js [camera_id] [frequency_hz] [duration_seconds]
 */

const mqtt = require('mqtt');

// Configuration
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const DEFAULT_CAMERA_ID = 'cam-01';
const DEFAULT_FREQUENCY = 10; // Hz
const DEFAULT_DURATION = 60; // seconds

// Parse command line arguments
const args = process.argv.slice(2);
const cameraId = args[0] || DEFAULT_CAMERA_ID;
const frequency = parseInt(args[1]) || DEFAULT_FREQUENCY;
const duration = parseInt(args[2]) || DEFAULT_DURATION;

const topic = `drone/detections/${cameraId}`;
const interval = 1000 / frequency; // Convert Hz to milliseconds

console.log(`🚁 Starting MQTT test data generator`);
console.log(`📡 Topic: ${topic}`);
console.log(`⚡ Frequency: ${frequency} Hz`);
console.log(`⏱️  Duration: ${duration} seconds`);
console.log(`🔌 Broker: ${MQTT_HOST}:${MQTT_PORT}`);
console.log('');

// Connect to MQTT broker
const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  let messageCount = 0;
  const startTime = Date.now();
  
  // Generate test data
  const generateDetection = () => {
    const now = Date.now();
    const detected = Math.random() > 0.3; // 70% chance of detection
    const objectCount = detected ? Math.floor(Math.random() * 5) + 1 : 0;
    
    const objects = [];
    for (let i = 0; i < objectCount; i++) {
      objects.push({
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        center: [Math.random(), Math.random()],
        bbox: [
          Math.random() * 0.8, // x
          Math.random() * 0.8, // y
          Math.random() * 0.2 + 0.05, // width (0.05 to 0.25)
          Math.random() * 0.2 + 0.05, // height (0.05 to 0.25)
        ],
        area: Math.random() * 0.1,
      });
    }
    
    const payload = {
      ts: now,
      detected,
      count: objectCount,
      objects,
    };
    
    return payload;
  };
  
  // Send messages at specified frequency
  const sendInterval = setInterval(() => {
    const payload = generateDetection();
    const message = JSON.stringify(payload);
    
    client.publish(topic, message, (err) => {
      if (err) {
        console.error('❌ Failed to publish message:', err);
      } else {
        messageCount++;
        if (messageCount % 50 === 0) {
          console.log(`📊 Sent ${messageCount} messages`);
        }
      }
    });
  }, interval);
  
  // Stop after specified duration
  setTimeout(() => {
    clearInterval(sendInterval);
    client.end();
    
    const elapsed = (Date.now() - startTime) / 1000;
    console.log('');
    console.log(`✅ Test completed`);
    console.log(`📊 Total messages sent: ${messageCount}`);
    console.log(`⏱️  Elapsed time: ${elapsed.toFixed(1)}s`);
    console.log(`📈 Average rate: ${(messageCount / elapsed).toFixed(1)} msg/s`);
    
    process.exit(0);
  }, duration * 1000);
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
  process.exit(1);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test data generator...');
  client.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping test data generator...');
  client.end();
  process.exit(0);
});
