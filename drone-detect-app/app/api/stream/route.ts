import { NextRequest } from 'next/server';
import { initializeServer, getRingBufferManager, isServerInitialized } from '@/lib/serverInit';
import { SSEMessage } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('camera_id') || 'cam-00';
  
  // Initialize server if not already done
  if (!isServerInitialized()) {
    await initializeServer();
  }
  
  const ringBufferManager = getRingBufferManager();

  // Create SSE response
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const stream = new ReadableStream({
    start(controller) {
      console.log(`📡 SSE stream started for camera ${cameraId}`);

      // Send initial data
      const latestFrame = ringBufferManager.getLatestFrame(cameraId);
      if (latestFrame) {
        const sseMessage: SSEMessage = {
          camera_id: cameraId,
          ts: latestFrame.ts,
          detected: latestFrame.detected,
          count: latestFrame.count,
          objects: latestFrame.objects,
          server_recv_ts: latestFrame.recvTs,
        };
        
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(sseMessage)}\n\n`));
      }

      // Set up periodic updates
      const pushInterval = parseInt(process.env.STREAM_PUSH_INTERVAL_MS || '150');
      const interval = setInterval(() => {
        try {
          const latestFrame = ringBufferManager.getLatestFrame(cameraId);
          
          if (latestFrame) {
            const sseMessage: SSEMessage = {
              camera_id: cameraId,
              ts: latestFrame.ts,
              detected: latestFrame.detected,
              count: latestFrame.count,
              objects: latestFrame.objects,
              server_recv_ts: latestFrame.recvTs,
            };
            
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(sseMessage)}\n\n`));
          }
        } catch (error) {
          console.error('❌ Error in SSE stream:', error);
        }
      }, pushInterval);

      // Send heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch (error) {
          console.error('❌ Error sending heartbeat:', error);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log(`📡 SSE stream closed for camera ${cameraId}`);
        clearInterval(interval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
