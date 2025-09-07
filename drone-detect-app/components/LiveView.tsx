'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DetectionData, DetectionObject } from '@/lib/frontend-types';

interface LiveViewProps {
  detectionData: DetectionData | null;
  width?: number;
  height?: number;
  className?: string;
}

interface SmoothBbox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  center: [number, number];
  area: number;
  timestamp: number;
}

export default function LiveView({ 
  detectionData, 
  width = 800, 
  height = 600, 
  className = '' 
}: LiveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const smoothBboxesRef = useRef<SmoothBbox[]>([]);
  const [showNoDetections, setShowNoDetections] = useState(false);
  const noDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Target FPS for rendering (5-10 FPS max)
  const TARGET_FPS = 8;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Smoothing parameters
  const SMOOTHING_FRAMES = 3;
  const MAX_BBOX_AGE = 2000; // Remove bboxes older than 2 seconds

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background placeholder
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, width, height);

    // Draw grid pattern
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw "Camera Feed" placeholder text
    ctx.fillStyle = '#9ca3af'; // gray-400
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Camera Feed Placeholder', width / 2, height / 2 - 20);
    ctx.fillText('(Video stream would be here)', width / 2, height / 2 + 10);

    // Draw detection overlays
    const currentTime = Date.now();
    const validBboxes = smoothBboxesRef.current.filter(
      bbox => currentTime - bbox.timestamp < MAX_BBOX_AGE
    );

    validBboxes.forEach((bbox) => {
      // Convert normalized coordinates to canvas coordinates
      const canvasX = bbox.x * width;
      const canvasY = bbox.y * height;
      const canvasWidth = bbox.width * width;
      const canvasHeight = bbox.height * height;

      // Draw bounding box
      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.lineWidth = 2;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);

      // Draw confidence label background
      const labelText = `${Math.round(bbox.confidence * 100)}%`;
      ctx.font = '12px system-ui';
      const textMetrics = ctx.measureText(labelText);
      const labelWidth = textMetrics.width + 8;
      const labelHeight = 16;

      ctx.fillStyle = '#ef4444'; // red-500
      ctx.fillRect(canvasX, canvasY - labelHeight, labelWidth, labelHeight);

      // Draw confidence label text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, canvasX + 4, canvasY - 4);

      // Draw center point
      const centerX = bbox.center[0] * width;
      const centerY = bbox.center[1] * height;
      
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Draw center cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 5, centerY);
      ctx.lineTo(centerX + 5, centerY);
      ctx.moveTo(centerX, centerY - 5);
      ctx.lineTo(centerX, centerY + 5);
      ctx.stroke();
    });

    // Update bboxes array
    smoothBboxesRef.current = validBboxes;
  }, [width, height]);

  const updateDetections = useCallback((data: DetectionData) => {
    const currentTime = Date.now();
    
    if (data.detected && data.objects.length > 0) {
      // Clear no detection timer
      if (noDetectionTimerRef.current) {
        clearTimeout(noDetectionTimerRef.current);
        noDetectionTimerRef.current = null;
      }
      setShowNoDetections(false);

      // Add new detections with smoothing
      data.objects.forEach((obj: DetectionObject) => {
        const [x, y, w, h] = obj.bbox;
        
        // Find existing bbox for smoothing
        const existingBbox = smoothBboxesRef.current.find(
          bbox => Math.abs(bbox.x - x) < 0.1 && Math.abs(bbox.y - y) < 0.1
        );

        if (existingBbox) {
          // Smooth the position
          existingBbox.x = (existingBbox.x * (SMOOTHING_FRAMES - 1) + x) / SMOOTHING_FRAMES;
          existingBbox.y = (existingBbox.y * (SMOOTHING_FRAMES - 1) + y) / SMOOTHING_FRAMES;
          existingBbox.width = (existingBbox.width * (SMOOTHING_FRAMES - 1) + w) / SMOOTHING_FRAMES;
          existingBbox.height = (existingBbox.height * (SMOOTHING_FRAMES - 1) + h) / SMOOTHING_FRAMES;
          existingBbox.confidence = obj.confidence;
          existingBbox.center = obj.center;
          existingBbox.area = obj.area;
          existingBbox.timestamp = currentTime;
        } else {
          // Add new bbox
          smoothBboxesRef.current.push({
            x,
            y,
            width: w,
            height: h,
            confidence: obj.confidence,
            center: obj.center,
            area: obj.area,
            timestamp: currentTime
          });
        }
      });
    } else {
      // No detections - start timer to show "No detections" message
      if (!noDetectionTimerRef.current) {
        noDetectionTimerRef.current = setTimeout(() => {
          setShowNoDetections(true);
        }, 2000); // Show after 2 seconds of no detections
      }
    }
  }, []);

  // Render loop with FPS limiting
  const renderLoop = useCallback(() => {
    const currentTime = Date.now();
    
    if (currentTime - lastRenderTimeRef.current >= FRAME_INTERVAL) {
      drawCanvas();
      lastRenderTimeRef.current = currentTime;
    }
    
    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [drawCanvas]);

  // Update detections when data changes
  useEffect(() => {
    if (detectionData) {
      updateDetections(detectionData);
    }
  }, [detectionData, updateDetections]);

  // Start render loop
  useEffect(() => {
    renderLoop();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (noDetectionTimerRef.current) {
        clearTimeout(noDetectionTimerRef.current);
      }
    };
  }, [renderLoop]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg shadow-lg"
      />
      
      {/* No detections overlay */}
      {showNoDetections && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
            <span className="text-lg font-medium">No detections</span>
          </div>
        </div>
      )}
      
      {/* Detection count overlay */}
      {detectionData && detectionData.detected && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg">
          <span className="text-sm font-medium">
            {detectionData.count} drone{detectionData.count !== 1 ? 's' : ''} detected
          </span>
        </div>
      )}
    </div>
  );
}
