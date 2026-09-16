import Link from 'next/link';
import { db } from '@/db';
import { plan } from '@/db/schema';
import { desc, isNull } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

const PRIORITY_LABEL: Record<string, string> = {
  low: 'low',
  medium: 'med',
  high: 'high',
};

export default async function PlansPage() {
  const rows = await db
    .select()
    .from(plan)
    .where(isNull(plan.deletedAt))
    .orderBy(desc(plan.createdAt));

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

      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <SectionTitle className="text-base">plans</SectionTitle>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            총 {rows.length}개
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/plans/new">+ 새 계획</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="border border-dashed border-border py-16 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            아직 계획이 없습니다.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/plans/new">+ 첫 계획 만들기</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plans/${p.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-3.5 transition-colors hover:bg-accent/50"
              >
                <span className="truncate">
                  <Prompt className="text-muted-foreground">▸ </Prompt>
                  <span className="font-medium">{p.title}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-brand tabular-nums">
                  [{PRIORITY_LABEL[p.priority] ?? p.priority}]
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {p.periodStart} ~ {p.periodEnd}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}