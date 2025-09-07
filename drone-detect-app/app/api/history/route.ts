import { NextRequest, NextResponse } from 'next/server';
import { initializeServer, isServerInitialized } from '@/lib/serverInit';
import { getDetectionHistory } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Initialize server if not already done
    if (!isServerInitialized()) {
      await initializeServer();
    }

    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('camera_id') || 'cam-00';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to timestamps' },
        { status: 400 }
      );
    }

    const from = parseInt(fromParam);
    const to = parseInt(toParam);
    const limit = limitParam ? parseInt(limitParam) : 2000;

    // Validate parameters
    if (isNaN(from) || isNaN(to)) {
      return NextResponse.json(
        { error: 'Invalid timestamp format. Use milliseconds since epoch.' },
        { status: 400 }
      );
    }

    if (from >= to) {
      return NextResponse.json(
        { error: 'from timestamp must be less than to timestamp' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 5000) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 5000' },
        { status: 400 }
      );
    }

    // Check time range (max 24 hours)
    const maxRange = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (to - from > maxRange) {
      return NextResponse.json(
        { error: 'Time range cannot exceed 24 hours' },
        { status: 400 }
      );
    }

    console.log(`📊 History query: camera=${cameraId}, from=${from}, to=${to}, limit=${limit}`);

    // Query database
    const results = await getDetectionHistory(cameraId, from, to, limit);

    // Transform results to response format
    const response = results.map(result => ({
      camera_id: result.cameraId,
      ts: result.ts,
      detected: result.payload.detected,
      count: result.payload.count,
      objects: result.payload.objects,
      server_recv_ts: result.recvTs,
    }));

    return NextResponse.json({
      camera_id: cameraId,
      from,
      to,
      count: response.length,
      data: response,
    });

  } catch (error) {
    console.error('❌ Error in history endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
