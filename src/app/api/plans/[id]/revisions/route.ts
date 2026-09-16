import { NextResponse } from 'next/server';
import { db } from '@/db';
import { planRevision } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/plans/[id]/revisions — 수정 이력 (T06-C08)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await db
      .select()
      .from(planRevision)
      .where(eq(planRevision.planId, id))
      .orderBy(desc(planRevision.revisedAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[GET /api/plans/[id]/revisions]', error);
    return NextResponse.json({ error: '수정 이력을 불러오지 못했습니다' }, { status: 500 });
  }
}