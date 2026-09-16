import { NextResponse } from 'next/server';
import { db } from '@/db';
import { plan, planRevision } from '@/db/schema';
import { planInputSchema } from '@/lib/validate';
import { eq } from 'drizzle-orm';
import { and, isNull } from 'drizzle-orm';
import { task } from '@/db/schema';


// GET /api/plans/[id] — 계획 상세
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [row] = await db.select().from(plan).where(eq(plan.id, id));

    if (!row) {
      return NextResponse.json({ error: '계획을 찾을 수 없습니다' }, { status: 404 });
    }
    return NextResponse.json(row);
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
    const { id } = await params;

    // 1. 현재 계획 조회 (수정 전 snapshot 확보)
    const [current] = await db.select().from(plan).where(eq(plan.id, id));
    if (!current) {
      return NextResponse.json({ error: '계획을 찾을 수 없습니다' }, { status: 404 });
    }

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

    // 3. 바뀐 필드 계산 (changed_fields: 실제 비교로 채움)
    const changedFields: string[] = [];
    if (current.title !== data.title) changedFields.push('title');
    if (current.periodStart !== data.periodStart) changedFields.push('periodStart');
    if (current.periodEnd !== data.periodEnd) changedFields.push('periodEnd');
    if (current.priority !== data.priority) changedFields.push('priority');
    if (current.successCriteria !== data.successCriteria) changedFields.push('successCriteria');
    if (current.estimatedMinutes !== data.estimatedMinutes) changedFields.push('estimatedMinutes');

    // 4. 변경이 없으면 리비전 없이 그대로 반환
    if (changedFields.length === 0) {
      return NextResponse.json({ plan: current, revisionCreated: false });
    }

    // 5. 수정 전 Plan을 PlanRevision에 스냅샷으로 저장
    const [revision] = await db
      .insert(planRevision)
      .values({
        planId: id,
        snapshot: current,
        changedFields,
      })
      .returning();

    // 6. Plan 업데이트
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
      .where(eq(plan.id, id))
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
    const { id } = await params;

    // UUID 형식 검증
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: '유효하지 않은 계획 ID입니다' }, { status: 400 });
    }

    const [current] = await db.select().from(plan).where(eq(plan.id, id));
    if (!current || current.deletedAt) {
      return NextResponse.json({ error: '계획을 찾을 수 없습니다' }, { status: 404 });
    }

    const now = new Date();

    // 1. Plan soft delete
    await db.update(plan).set({ deletedAt: now }).where(eq(plan.id, id));

    // 2. 그 Plan의 Task도 soft delete (cascade soft delete)
    //    → 집계에서 자동 제외 (Task.deletedAt IS NULL 조건이 이미 있음)
    await db
      .update(task)
      .set({ deletedAt: now })
      .where(and(eq(task.planId, id), isNull(task.deletedAt)));

    // 3. 결과 반환
    const [result] = await db.select().from(plan).where(eq(plan.id, id));
    return NextResponse.json(result);
  } catch (error) {
    console.error('[DELETE /api/plans/[id]]', error);
    return NextResponse.json({ error: '계획을 삭제하지 못했습니다' }, { status: 500 });
  }
}