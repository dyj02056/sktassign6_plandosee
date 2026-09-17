import Link from 'next/link';
import { db } from '@/db';
import { plan } from '@/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/domain/ExportButton';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';
import { LogoutButton } from '@/components/domain/LogoutButton';

const PRIORITY_LABEL: Record<string, string> = {
  low: 'low',
  medium: 'med',
  high: 'high',
};

export async function HomeDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const recentPlans = await db
    .select()
    .from(plan)
    .where(and(eq(plan.userId, userId), isNull(plan.deletedAt)))
    .orderBy(desc(plan.createdAt))
    .limit(3);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-10 flex items-center justify-between border border-border bg-accent/20 p-4 text-sm">
        <p className="font-mono">
          <span className="text-brand">$ </span>
          <span className="text-muted-foreground">whoami </span>
          {email}
        </p>
        <LogoutButton />
      </div>

      <header className="mb-12">
        <div className="font-mono text-xs text-muted-foreground">
          <Prompt>$ </Prompt>
          plandosee --v2
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          플랜두씨 다이어리
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          계획, 실제로 한 일, 돌아보기를 한 곳에서.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>로그인됨</span>
          <span aria-hidden>·</span>
          <span>서버 DB 영속</span>
          <span aria-hidden>·</span>
          <span>JSON 내보내기</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/plans">내 계획 보기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/review">돌아보기</Link>
          </Button>
          <ExportButton variant="ghost" />
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <SectionTitle>plans --recent</SectionTitle>
          <Link
            href="/plans"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
          >
            [전체 보기 →]
          </Link>
        </div>

        {recentPlans.length === 0 ? (
          <div className="border border-dashed border-border py-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              아직 계획이 없습니다.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/plans/new">+ 첫 계획 만들기</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {recentPlans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plans/${p.id}`}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <span className="truncate">
                    <Prompt className="text-muted-foreground">▸ </Prompt>
                    <span className="font-medium">{p.title}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      [{PRIORITY_LABEL[p.priority] ?? p.priority}]
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {p.periodStart} ~ {p.periodEnd}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}