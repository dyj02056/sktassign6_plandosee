import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { plan, planRevision, task } from '@/db/schema';
import { planInputSchema } from '@/lib/validate';
import { and, eq, isNull } from 'drizzle-orm';

// 소유권 확인 헬퍼 (T07-C121: 남의 자료는 404로 존재 자체를 감춤)
// 성공하면 plan row, 실패하면 NextResponse 반환
async function loadOwnedPlan(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(plan)
    .where(and(eq(plan.id, id), eq(plan.userId, userId)))
    .limit(1);

  if (!row || row.deletedAt) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: '계획을 찾을 수 없습니다' },
        { status: 404 } // T07-C121
      ),
    };
  }
  return { ok: true as const, row };
}

// GET /api/plans/[id] — 계획 상세
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadOwnedPlan(id, session.user.id);
    if (!result.ok) return result.response;

    return NextResponse.json(result.row);
  } catch (error) {
    console.error('[GET /api/plans/[id]]', error);
    return NextResponse.json({ error: '계획을 불러오지 못했습니다' }, { status: 500 });
  }
}

// PUT /api/plans/[id] — 계획 수정 + PlanRevision 생성 (T06-C08)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. 소유권 확인 + 현재 계획 조회
    const result = await loadOwnedPlan(id, session.user.id);
    if (!result.ok) return result.response;
    const current = result.row;

    // 2. 입력 검증
    const body = await request.json();
    const parsed = planInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // 3. 바뀐 필드 계산
    const changedFields: string[] = [];
    if (current.title !== data.title) changedFields.push('title');
    if (current.periodStart !== data.periodStart) changedFields.push('periodStart');
    if (current.periodEnd !== data.periodEnd) changedFields.push('periodEnd');
    if (current.priority !== data.priority) changedFields.push('priority');
    if (current.successCriteria !== data.successCriteria) changedFields.push('successCriteria');
    if (current.estimatedMinutes !== data.estimatedMinutes) changedFields.push('estimatedMinutes');

    // 4. 변경 없으면 그대로 반환
    if (changedFields.length === 0) {
      return NextResponse.json({ plan: current, revisionCreated: false });
    }

    // 5. 수정 이력 저장 (T06-C08) — userId도 함께 부여
    const [revision] = await db
      .insert(planRevision)
      .values({
        userId: session.user.id,   // ★
        planId: id,
        snapshot: current,
        changedFields,
      })
      .returning();

    // 6. Plan 업데이트 — 소유자 조건 재확인
    const [updated] = await db
      .update(plan)
      .set({
        title: data.title,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        priority: data.priority,
        successCriteria: data.successCriteria,
        estimatedMinutes: data.estimatedMinutes,
        updatedAt: new Date(),
      })
      .where(and(eq(plan.id, id), eq(plan.userId, session.user.id)))
      .returning();

    return NextResponse.json({ plan: updated, revision, revisionCreated: true });
  } catch (error) {
    console.error('[PUT /api/plans/[id]]', error);
    return NextResponse.json({ error: '계획을 수정하지 못했습니다' }, { status: 500 });
  }
}

// DELETE /api/plans/[id] — soft delete (Plan + Task cascade soft)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // UUID 형식 검증
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: '올바르지 않은 계획 ID입니다' }, { status: 400 });
    }

    // 소유권 확인
    const result = await loadOwnedPlan(id, session.user.id);
    if (!result.ok) return result.response;

    const now = new Date();

    // 1. Plan soft delete — 소유자 조건 재확인
    await db
      .update(plan)
      .set({ deletedAt: now })
      .where(and(eq(plan.id, id), eq(plan.userId, session.user.id)));

    // 2. 그 Plan의 Task도 soft delete
    await db
      .update(task)
      .set({ deletedAt: now })
      .where(and(
        eq(task.planId, id),
        eq(task.userId, session.user.id),   // ★
        isNull(task.deletedAt)
      ));

    // 3. 결과 반환
    const [finalRow] = await db
      .select()
      .from(plan)
      .where(and(eq(plan.id, id), eq(plan.userId, session.user.id)));
    return NextResponse.json(finalRow);
  } catch (error) {
    console.error('[DELETE /api/plans/[id]]', error);
    return NextResponse.json({ error: '계획을 삭제하지 못했습니다' }, { status: 500 });
  }
}