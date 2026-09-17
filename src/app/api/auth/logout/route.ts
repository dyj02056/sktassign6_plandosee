import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { user } from '@/db/schema';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // sessionVersion += 1 → 이전에 발급된 모든 JWT 무효화 (T07-C114)
    await db
      .update(user)
      .set({ sessionVersion: sql`${user.sessionVersion} + 1` })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/logout]', error);
    return NextResponse.json(
      { error: '로그아웃에 실패했습니다' },
      { status: 500 }
    );
  }
}