import { NextResponse } from 'next/server';
import { db } from '@/db';
import { task, executionLog } from '@/db/schema';
import { computeAggregates } from '@/lib/aggregate';
import { eq, and, isNull, inArray } from 'drizzle-orm';

// GET /api/review?planId=xxx — 해당 계획의 집계
// GET /api/review — 모든 계획의 집계
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    // 1. 대상 Task 조회
    const tasks = planId
      ? await db
          .select()
          .from(task)
          .where(and(eq(task.planId, planId), isNull(task.deletedAt)))
      : await db.select().from(task).where(isNull(task.deletedAt));

    // 2. 그 Task들의 실행 기록
    const taskIds = tasks.map((t) => t.id);
    const executions =
      taskIds.length > 0
        ? await db
            .select()
            .from(executionLog)
            .where(inArray(executionLog.taskId, taskIds))
        : [];

    // 3. 집계
    const aggregates = computeAggregates(tasks, executions);

    return NextResponse.json({
      planId: planId ?? null,
      aggregates,
      taskCount: tasks.length,
    });
  } catch (error) {
    console.error('[GET /api/review]', error);
    return NextResponse.json(
      { error: '돌아보기 집계를 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}