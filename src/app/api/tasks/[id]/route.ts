import { NextResponse } from 'next/server';
import { db } from '@/db';
import { task } from '@/db/schema';
import { taskInputSchema } from '@/lib/validate';
import { eq } from 'drizzle-orm';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/tasks/[id] — 할 일 상세
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [row] = await db.select().from(task).where(eq(task.id, id));

    if (!row || row.deletedAt) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    return NextResponse.json(row);
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json(
      { error: '할 일을 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] — 할 일 수정
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [current] = await db.select().from(task).where(eq(task.id, id));
    if (!current || current.deletedAt) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // planId는 수정 대상이 아니므로 제거 후 검증
    const { planId: _ignored, ...editable } = body ?? {};
    const parsed = taskInputSchema.omit({ planId: true }).safeParse(editable);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [updated] = await db
      .update(task)
      .set({
        title: data.title,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        estimatedMinutes: data.estimatedMinutes,
      })
      .where(eq(task.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/tasks/[id]]', error);
    return NextResponse.json(
      { error: '할 일을 수정하지 못했습니다' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] — soft delete (deletedAt 설정)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [current] = await db.select().from(task).where(eq(task.id, id));
    if (!current || current.deletedAt) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const [deleted] = await db
      .update(task)
      .set({ deletedAt: new Date() })
      .where(eq(task.id, id))
      .returning();

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error);
    return NextResponse.json(
      { error: '할 일을 삭제하지 못했습니다' },
      { status: 500 }
    );
  }
}