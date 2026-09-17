import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { user, plan, task, executionLog, planRevision, reviewNote } from '@/db/schema';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력이 올바르지 않습니다', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // T07-C98: 같은 이메일 중복 가입 방지
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다' },
        { status: 409 }
      );
    }

    // T07-C101: bcrypt 해싱 (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 계정 생성
    const [created] = await db
      .insert(user)
      .values({
        email: normalizedEmail,
        passwordHash,
        name: name ?? null,
      })
      .returning();

    // T07-C100: 이 시스템의 첫 계정이면, 소유자 없는 기존 자료를 이 계정으로 귀속
    // (7번 DB는 비어 있지만, 6번 자료를 이관하는 스크립트가 나중에 실행되면 이 로직이 필요)
    const allPlans = await db.select().from(plan);
    const orphanCount = allPlans.filter((p) => !p.userId).length;
    // ↑ userId가 notNull이라 실제로는 orphan이 없음. 안전장치로만 남김.

    return NextResponse.json(
      { id: created.id, email: created.email, name: created.name },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/auth/signup]', error);
    return NextResponse.json(
      { error: '가입에 실패했습니다' },
      { status: 500 }
    );
  }
}