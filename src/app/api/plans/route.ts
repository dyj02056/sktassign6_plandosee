import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { plan } from '@/db/schema';
import { planInputSchema } from '@/lib/validate';
import { and, desc, eq, isNull } from 'drizzle-orm';

// GET /api/plans — 내 계획 목록 (T07-C125: 내 것만)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(plan)
      .where(and(eq(plan.userId, session.user.id), isNull(plan.deletedAt)))
      .orderBy(desc(plan.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error('[GET /api/plans]', error);
    return NextResponse.json(
      { error: '계획 목록을 불러오지 못했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/plans — 계획 생성
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = planInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(plan)
      .values({
        userId: session.user.id,          // ★ 소유자 부여
        title: data.title,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        priority: data.priority,
        successCriteria: data.successCriteria,
        estimatedMinutes: data.estimatedMinutes,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/plans]', error);
    return NextResponse.json(
      { error: '계획을 만들지 못했습니다' },
      { status: 500 }
    );
  }
}