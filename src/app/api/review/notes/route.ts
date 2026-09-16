import { NextResponse } from 'next/server';
import { db } from '@/db';
import { reviewNote } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const noteInputSchema = z.object({
  planId: z.string().uuid(),
  fixNote: z.string().min(1, '고칠 점을 입력하세요').max(500),
  carriedToPlanId: z.string().uuid().nullable().optional(),
});

// GET /api/review/notes?planId=xxx — 고칠 점 목록
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      const rows = await db.select().from(reviewNote).orderBy(desc(reviewNote.id));
      return NextResponse.json(rows);
    }

    const rows = await db
      .select()
      .from(reviewNote)
      .where(eq(reviewNote.planId, planId));

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
    const body = await request.json();
    const parsed = noteInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(reviewNote)
      .values({
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