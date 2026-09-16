import { NextResponse } from 'next/server';
import { db } from '@/db';
import { task } from '@/db/schema';
import { taskInputSchema } from '@/lib/validate';
import { eq, desc, isNull, and } from 'drizzle-orm';

// GET /api/tasks?planId=xxx — 할 일 목록 (지우지 않은 것만)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'planId 쿼리 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(task)
      .where(and(eq(task.planId, planId), isNull(task.deletedAt)))
      .orderBy(desc(task.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json(
      { error: '할 일 목록을 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/tasks — 할 일 생성 (T06-C09)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = taskInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(task)
      .values({
        planId: data.planId,
        title: data.title,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        estimatedMinutes: data.estimatedMinutes,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json(
      { error: '할 일을 만들지 못했습니다' },
      { status: 500 }
    );
  }
}