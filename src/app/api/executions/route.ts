import { NextResponse } from 'next/server';
import { db } from '@/db';
import { executionLog } from '@/db/schema';
import { executionInputSchema } from '@/lib/validate';
import { eq, desc } from 'drizzle-orm';

// GET /api/executions?taskId=xxx — 실행 기록 목록
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId 쿼리 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(executionLog)
      .where(eq(executionLog.taskId, taskId))
      .orderBy(desc(executionLog.startedAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[GET /api/executions]', error);
    return NextResponse.json(
      { error: '실행 기록을 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/executions — 실행 기록 생성 (T06-C10)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = executionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(executionLog)
      .values({
        taskId: data.taskId,
        startedAt: new Date(data.startedAt),
        endedAt: new Date(data.endedAt),
        durationMinutes: data.durationMinutes,
        blockedReason: data.blockedReason ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/executions]', error);
    return NextResponse.json(
      { error: '실행 기록을 만들지 못했습니다' },
      { status: 500 }
    );
  }
}