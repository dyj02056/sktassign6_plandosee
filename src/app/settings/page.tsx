import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { DeleteAccountButton } from '@/components/domain/DeleteAccountButton';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null; // 미들웨어가 /login으로 보냄
  }

  const [me] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!me) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-6">
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
        >
          ← home
        </Link>
      </header>

      <div className="mb-8">
        <SectionTitle className="text-base">settings</SectionTitle>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          <Prompt className="text-muted-foreground"># </Prompt>
          계정 정보와 위험 구역
        </p>
      </div>

      {/* 계정 정보 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">계정 정보</h2>
        <dl className="divide-y divide-border border-y border-border">
          <div className="grid grid-cols-[120px_1fr] gap-4 py-3">
            <dt className="font-mono text-xs text-muted-foreground">이메일</dt>
            <dd className="font-mono text-sm">{me.email}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-4 py-3">
            <dt className="font-mono text-xs text-muted-foreground">이름</dt>
            <dd className="font-mono text-sm">{me.name ?? '(미설정)'}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-4 py-3">
            <dt className="font-mono text-xs text-muted-foreground">가입일</dt>
            <dd className="font-mono text-sm">
              {new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(me.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      {/* 위험 구역 */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-destructive">
          위험 구역
        </h2>
        <div className="border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="mb-1 font-medium">계정 삭제</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            계정을 삭제하면 <strong className="text-destructive">모든 계획·할 일·실행 기록이 함께 삭제</strong>됩니다.
            이 작업은 되돌릴 수 없습니다.
          </p>
          <DeleteAccountButton />
        </div>
      </section>
    </main>
  );
}