import { MQTTPayload, NormalizedPayload, ValidationResult, DetectionObject } from './types';

export function validateMQTTPayload(payload: any, topic: string): ValidationResult {
  const errors: string[] = [];
  
  // Check if payload is an object
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { isValid: false, errors };
  }

  // Validate timestamp
  if (typeof payload.ts !== 'number') {
    errors.push('ts must be a number');
  } else {
    const now = Date.now();
    const maxFuture = now + 30000; // 30 seconds in future
    if (payload.ts > maxFuture) {
      errors.push('ts cannot be more than 30 seconds in the future');
    }
  }

  // Validate detected field
  if (typeof payload.detected !== 'boolean') {
    errors.push('detected must be a boolean');
  }

  // Validate count
  if (typeof payload.count !== 'number' || !Number.isInteger(payload.count) || payload.count < 0) {
    errors.push('count must be a non-negative integer');
  }

  // Validate objects array
  if (!Array.isArray(payload.objects)) {
    errors.push('objects must be an array');
  } else {
    // Check count matches objects length
    if (payload.count !== payload.objects.length) {
      errors.push('count must equal objects array length');
    }

    // Validate each object
    payload.objects.forEach((obj: any, index: number) => {
      const objectErrors = validateDetectionObject(obj, index);
      errors.push(...objectErrors);
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Extract camera ID from topic
  const cameraId = extractCameraIdFromTopic(topic);
  
  // Create normalized payload
  const normalizedPayload: NormalizedPayload = {
    cameraId,
    ts: payload.ts,
    detected: payload.detected,
    count: payload.count,
    objects: payload.objects,
    recvTs: Date.now(),
  };

  return {
    isValid: true,
    errors: [],
    normalizedPayload,
  };
}

function validateDetectionObject(obj: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `objects[${index}]`;

  if (!obj || typeof obj !== 'object') {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  // Validate confidence
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    errors.push(`${prefix}.confidence must be a number between 0 and 1`);
  }

  // Validate center
  if (!Array.isArray(obj.center) || obj.center.length !== 2) {
    errors.push(`${prefix}.center must be an array with exactly 2 numbers`);
  } else {
    if (typeof obj.center[0] !== 'number' || obj.center[0] < 0 || obj.center[0] > 1) {
      errors.push(`${prefix}.center[0] must be a number between 0 and 1`);
    }
    if (typeof obj.center[1] !== 'number' || obj.center[1] < 0 || obj.center[1] > 1) {
      errors.push(`${prefix}.center[1] must be a number between 0 and 1`);
    }
  }

  // Validate bbox
  if (!Array.isArray(obj.bbox) || obj.bbox.length !== 4) {
    errors.push(`${prefix}.bbox must be an array with exactly 4 numbers`);
  } else {
    const [x, y, w, h] = obj.bbox;
    if (typeof x !== 'number' || x < 0 || x > 1) {
      errors.push(`${prefix}.bbox[0] (x) must be a number between 0 and 1`);
    }
    if (typeof y !== 'number' || y < 0 || y > 1) {
      errors.push(`${prefix}.bbox[1] (y) must be a number between 0 and 1`);
    }
    if (typeof w !== 'number' || w <= 0 || w > 1) {
      errors.push(`${prefix}.bbox[2] (width) must be a positive number between 0 and 1`);
    }
    if (typeof h !== 'number' || h <= 0 || h > 1) {
      errors.push(`${prefix}.bbox[3] (height) must be a positive number between 0 and 1`);
    }
  }

  // Validate area
  if (typeof obj.area !== 'number' || obj.area < 0) {
    errors.push(`${prefix}.area must be a non-negative number`);
  }

  return errors;
}

function extractCameraIdFromTopic(topic: string): string {
  // Extract camera ID from topic pattern: drone/detections/<camera_id>
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'drone' && parts[1] === 'detections') {
    return parts[2] || 'cam-00'; // Use default if empty
  }
  return 'cam-00'; // Default camera ID
}

export function sanitizePayload(payload: any): MQTTPayload {
  // Basic sanitization - ensure required fields exist with defaults
  return {
    ts: typeof payload.ts === 'number' ? payload.ts : Date.now(),
    detected: typeof payload.detected === 'boolean' ? payload.detected : false,
    count: typeof payload.count === 'number' && payload.count >= 0 ? payload.count : 0,
    objects: Array.isArray(payload.objects) ? payload.objects : [],
  };
}
