import { NextResponse } from 'next/server';
import { db } from '@/db';
import { task } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/tasks/[id]/complete — 완료 처리 (멱등, T06-C21)
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    // UUID 형식 검증 (무효한 UUID → 400, 500 아님)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 할 일 ID입니다' },
        { status: 400 }
      );
    }

    // 1. 현재 Task 확인
    const [current] = await db.select().from(task).where(eq(task.id, id));

    if (!current || current.deletedAt) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. 조건부 UPDATE: completed_at이 NULL일 때만 NOW()로 설정
    //    이미 완료된 Task에 두 번째 요청이 오면 0행 변경 (멱등)
    await db
      .update(task)
      .set({ completedAt: new Date() })
      .where(and(eq(task.id, id), isNull(task.completedAt)));

    // 3. 항상 최신 상태 반환 (첫 요청이든 두 번째든 동일)
    const [result] = await db.select().from(task).where(eq(task.id, id));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[POST /api/tasks/[id]/complete]', error);
    return NextResponse.json(
      { error: '완료 처리에 실패했습니다' },
      { status: 500 }
    );
  }
}