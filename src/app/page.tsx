import Link from 'next/link';
import { ArrowRight, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { db } from '@/db';
import { plan } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/domain/ExportButton';
import { desc, isNull } from 'drizzle-orm';


export default async function HomePage() {
  const recentPlans = await db
  .select()
  .from(plan)
  .where(isNull(plan.deletedAt))
  .orderBy(desc(plan.createdAt))
  .limit(3);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* C82: 로그인 없음 안내 (문구 그대로) */}
      <div className="mb-8 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
        <p>
          지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요.
        </p>
      </div>

      {/* 히어로 */}
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          플랜두씨 다이어리
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          계획, 실제로 한 일, 돌아보기를 한 곳에서.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/plans">
              계획 보기
              <ArrowRight size={16} weight="bold" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/review">돌아보기</Link>
          </Button>
          <ExportButton variant="ghost" />
        </div>
      </header>

      {/* 최근 계획 */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">최근 계획</h2>
          <Link
            href="/plans"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            전체 보기
          </Link>
        </div>

        {recentPlans.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              아직 계획이 없습니다.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/plans/new">첫 계획 만들기</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentPlans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plans/${p.id}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
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