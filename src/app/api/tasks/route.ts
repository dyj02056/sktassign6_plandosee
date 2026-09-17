import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { task, plan } from '@/db/schema';
import { taskInputSchema } from '@/lib/validate';
import { eq, desc, isNull, and } from 'drizzle-orm';

// GET /api/tasks?planId=xxx — 할 일 목록 (지운 것 제외, 내 것만)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .where(and(
        eq(task.planId, planId),
        eq(task.userId, session.user.id),   // ★ T07-C123, C125: 내 것만
        isNull(task.deletedAt)
      ))
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = taskInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ★ 부모 plan이 진짜 내 것인지 확인 (T07-C123: 본문에 남의 planId를 넣어도 차단)
    const [parentPlan] = await db
      .select()
      .from(plan)
      .where(and(
        eq(plan.id, data.planId),
        eq(plan.userId, session.user.id)
      ))
      .limit(1);

    if (!parentPlan || parentPlan.deletedAt) {
      return NextResponse.json(
        { error: '계획을 찾을 수 없습니다' },
        { status: 404 }   // T07-C121
      );
    }

    const [created] = await db
      .insert(task)
      .values({
        userId: session.user.id,           // ★ 소유자 부여
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