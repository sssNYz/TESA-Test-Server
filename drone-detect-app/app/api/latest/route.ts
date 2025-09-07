import { NextRequest, NextResponse } from 'next/server';
import { initializeServer, getRingBufferManager, isServerInitialized } from '@/lib/serverInit';
import { getLatestDetection } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('camera_id') || 'cam-00';
    
    // Initialize server if not already done
    if (!isServerInitialized()) {
      await initializeServer();
    }
    
    const ringBufferManager = getRingBufferManager();

    // First try to get from in-memory ring buffer
    let latestFrame = ringBufferManager.getLatestFrame(cameraId);

    // If not in memory, try database
    if (!latestFrame) {
      console.log(`📊 No recent data in memory for camera ${cameraId}, checking database...`);
      
      const dbResult = await getLatestDetection(cameraId);
      if (dbResult) {
        latestFrame = {
          cameraId: dbResult.cameraId,
          ts: dbResult.ts,
          recvTs: dbResult.recvTs,
          detected: dbResult.payload.detected,
          count: dbResult.payload.count,
          objects: dbResult.payload.objects,
        };
      }
    }

    if (!latestFrame) {
      return NextResponse.json(
        { error: 'No data found for camera', cameraId },
        { status: 404 }
      );
    }

    const response = {
      camera_id: cameraId,
      ts: latestFrame.ts,
      detected: latestFrame.detected,
      count: latestFrame.count,
      objects: latestFrame.objects,
      server_recv_ts: latestFrame.recvTs,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in latest endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
