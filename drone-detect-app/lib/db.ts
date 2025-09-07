import { PrismaClient } from '@prisma/client';
import { DetectionRaw, DetectionObjectDB, BatchInsertData } from './types';

// Global Prisma client instance
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

export async function batchInsertDetections(data: BatchInsertData[]): Promise<number> {
  const client = getPrismaClient();
  
  if (data.length === 0) {
    return 0;
  }

  try {
    const startTime = Date.now();
    
    // Convert to Prisma format
    const prismaData = data.map(item => ({
      cameraId: item.cameraId,
      ts: BigInt(item.ts),
      recvTs: BigInt(item.recvTs),
      count: item.count,
      payload: item.payload as any,
      msgKey: item.msgKey,
    }));

    const result = await client.detectionRaw.createMany({
      data: prismaData,
      skipDuplicates: true, // Skip duplicates based on unique constraint
    });

    const duration = Date.now() - startTime;
    console.log(`📊 Batch insert: ${result.count} rows in ${duration}ms`);
    
    return result.count;
  } catch (error) {
    console.error('❌ Batch insert failed:', error);
    throw error;
  }
}

export async function getLatestDetection(cameraId: string): Promise<DetectionRaw | null> {
  const client = getPrismaClient();
  
  try {
    const result = await client.detectionRaw.findFirst({
      where: { cameraId },
      orderBy: { ts: 'desc' },
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      cameraId: result.cameraId,
      ts: Number(result.ts),
      recvTs: Number(result.recvTs),
      count: result.count,
      payload: result.payload as any,
      msgKey: result.msgKey || undefined,
    };
  } catch (error) {
    console.error('❌ Get latest detection failed:', error);
    throw error;
  }
}

export async function getDetectionHistory(
  cameraId: string,
  from: number,
  to: number,
  limit: number = 2000
): Promise<DetectionRaw[]> {
  const client = getPrismaClient();
  
  try {
    const results = await client.detectionRaw.findMany({
      where: {
        cameraId,
        ts: {
          gte: BigInt(from),
          lte: BigInt(to),
        },
      },
      orderBy: { ts: 'asc' },
      take: Math.min(limit, 5000), // Cap at 5000 for safety
    });

    return results.map(result => ({
      id: result.id,
      cameraId: result.cameraId,
      ts: Number(result.ts),
      recvTs: Number(result.recvTs),
      count: result.count,
      payload: result.payload as any,
      msgKey: result.msgKey || undefined,
    }));
  } catch (error) {
    console.error('❌ Get detection history failed:', error);
    throw error;
  }
}

export async function createDetectionObjects(
  cameraId: string,
  ts: number,
  objects: any[]
): Promise<void> {
  const client = getPrismaClient();
  
  if (objects.length === 0) {
    return;
  }

  try {
    const prismaData = objects.map((obj, index) => ({
      cameraId,
      ts: BigInt(ts),
      objectIdx: index,
      confidence: obj.confidence,
      centerX: obj.center[0],
      centerY: obj.center[1],
      bboxX: obj.bbox[0],
      bboxY: obj.bbox[1],
      bboxW: obj.bbox[2],
      bboxH: obj.bbox[3],
      area: obj.area,
    }));

    await client.detectionObject.createMany({
      data: prismaData,
      skipDuplicates: true,
    });
  } catch (error) {
    console.error('❌ Create detection objects failed:', error);
    throw error;
  }
}
