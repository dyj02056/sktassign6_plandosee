import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { reviewNote, plan } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const noteInputSchema = z.object({
  planId: z.string().uuid(),
  fixNote: z.string().min(1, '고칠 점을 입력하세요').max(500),
  carriedToPlanId: z.string().uuid().nullable().optional(),
});

// GET /api/review/notes?planId=xxx — 고칠 점 목록
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      // ★ 내 것만 (T07-C125: 목록 오염 방지)
      const rows = await db
        .select()
        .from(reviewNote)
        .where(eq(reviewNote.userId, session.user.id))
        .orderBy(desc(reviewNote.id));
      return NextResponse.json(rows);
    }

    const rows = await db
      .select()
      .from(reviewNote)
      .where(and(
        eq(reviewNote.planId, planId),
        eq(reviewNote.userId, session.user.id)   // ★
      ));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[GET /api/review/notes]', error);
    return NextResponse.json(
      { error: '고칠 점을 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/review/notes — 고칠 점 저장 (C33)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = noteInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ★ 부모 plan이 진짜 내 것인지 확인 (T07-C123)
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
      .insert(reviewNote)
      .values({
        userId: session.user.id,           // ★ 소유자 부여
        planId: data.planId,
        fixNote: data.fixNote,
        carriedToPlanId: data.carriedToPlanId ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/review/notes]', error);
    return NextResponse.json(
      { error: '고칠 점을 저장하지 못했습니다' },
      { status: 500 }
    );
  }
}