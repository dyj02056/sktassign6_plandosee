import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { user } from '@/db/schema';

// POST /api/auth/delete — 계정 삭제 (cascade로 모든 자료 삭제)
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // user 삭제 → FK onDelete: 'cascade'로 plan, task, execution_log 등 자동 삭제
    await db.delete(user).where(eq(user.id, session.user.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/delete]', error);
    return NextResponse.json(
      { error: '계정 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}