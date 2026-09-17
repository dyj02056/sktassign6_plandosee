import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { executionLog, task } from '@/db/schema';
import { executionInputSchema } from '@/lib/validate';
import { eq, desc, and } from 'drizzle-orm';

// GET /api/executions?taskId=xxx — 실행 기록 목록
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .where(and(
        eq(executionLog.taskId, taskId),
        eq(executionLog.userId, session.user.id)   // ★ T07-C123, C125
      ))
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = executionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ★ 부모 task가 진짜 내 것인지 확인 (T07-C123)
    const [parentTask] = await db
      .select()
      .from(task)
      .where(and(
        eq(task.id, data.taskId),
        eq(task.userId, session.user.id)
      ))
      .limit(1);

    if (!parentTask) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다' },
        { status: 404 }   // T07-C121
      );
    }

    const [created] = await db
      .insert(executionLog)
      .values({
        userId: session.user.id,           // ★ 소유자 부여
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