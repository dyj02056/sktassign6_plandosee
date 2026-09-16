import Link from 'next/link';
import { db } from '@/db';
import { plan } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

const priorityLabel: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

export default async function PlansPage() {
  const rows = await db.select().from(plan).orderBy(desc(plan.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">계획</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length}개의 계획
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/plans/new">
            <Plus size={16} weight="bold" />
            새 계획
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            아직 계획이 없습니다. 첫 계획을 세워보세요.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plans/${p.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-medium">{p.title}</h2>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {priorityLabel[p.priority] ?? p.priority}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span>
                    {p.periodStart} ~ {p.periodEnd}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{p.estimatedMinutes}분</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}