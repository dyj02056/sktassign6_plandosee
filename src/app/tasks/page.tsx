import Link from 'next/link';
import { db } from '@/db';
import { task, executionLog, plan } from '@/db/schema';
import { eq, and, isNull, isNotNull, inArray, desc } from 'drizzle-orm';
import { isOverdue } from '@/lib/time';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

type Filter = 'active' | 'done' | 'overdue' | 'blocked' | 'all';

const FILTER_LABEL: Record<Filter, string> = {
  active: '전체',
  done: '완료',
  overdue: '지연',
  blocked: '막힘',
  all: '전체',
};

const FILTER_ORDER: Filter[] = ['active', 'done', 'overdue', 'blocked', 'all'];

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

function normalizeFilter(v: string | undefined): Filter {
  if (v && FILTER_ORDER.includes(v as Filter)) return v as Filter;
  return 'active';
}

function formatKst(iso: string | Date | null): string {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export default async function TasksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = normalizeFilter(sp.filter);

  let whereCondition = isNull(task.deletedAt);
  if (filter === 'done') {
    whereCondition = and(isNull(task.deletedAt), isNotNull(task.completedAt))!;
  }

  const allTasks = await db
    .select()
    .from(task)
    .where(whereCondition)
    .orderBy(desc(task.createdAt));

  const planIds = [...new Set(allTasks.map((t) => t.planId))];
  const plans =
    planIds.length > 0
      ? await db.select().from(plan).where(inArray(plan.id, planIds))
      : [];
  const planTitleMap = new Map(plans.map((p) => [p.id, p.title]));

  const taskIds = allTasks.map((t) => t.id);
  const executions =
    taskIds.length > 0
      ? await db
          .select()
          .from(executionLog)
          .where(inArray(executionLog.taskId, taskIds))
      : [];

  const executionsByTask = new Map<string, typeof executions>();
  for (const e of executions) {
    const list = executionsByTask.get(e.taskId) ?? [];
    list.push(e);
    executionsByTask.set(e.taskId, list);
  }

  let filtered = allTasks;
  if (filter === 'overdue') {
    filtered = allTasks.filter((t) => isOverdue(t.dueAt, t.completedAt));
  } else if (filter === 'blocked') {
    filtered = allTasks.filter((t) => {
      const exs = executionsByTask.get(t.id) ?? [];
      return exs.some((e) => e.blockedReason && e.blockedReason.trim() !== '');
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <Link
          href="/review"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
        >
          ← /review
        </Link>
      </header>

      <div className="mb-6">
        <SectionTitle className="text-base">
          tasks --filter={filter}
        </SectionTitle>
        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
          {filtered.length}건
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 font-mono text-xs">
        {FILTER_ORDER.map((f) => (
          <Link
            key={f}
            href={`/tasks?filter=${f}`}
            className={`border px-2.5 py-1 transition-colors ${
              f === filter
                ? 'border-brand bg-brand-muted text-brand'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            --{f}
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            이 조건에 맞는 할 일이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {filtered.map((t) => {
            const exs = executionsByTask.get(t.id) ?? [];
            const totalActual = exs.reduce((s, e) => s + e.durationMinutes, 0);
            const isDone = t.completedAt !== null;
            const isOver = isOverdue(t.dueAt, t.completedAt);
            const blockedReasons = exs
              .map((e) => e.blockedReason)
              .filter((r): r is string => !!r && r.trim() !== '');

            return (
              <li key={t.id} className="grid grid-cols-[auto_1fr] items-baseline gap-3 py-3.5">
                <span
                  className={`font-mono text-sm ${
                    isDone ? 'text-brand' : isOver ? 'text-amber-400' : 'text-muted-foreground'
                  }`}
                >
                  {isDone ? '[✓]' : isOver ? '[!]' : '[ ]'}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={`font-medium ${isDone ? 'text-muted-foreground line-through' : ''}`}>
                      {t.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {planTitleMap.get(t.planId) ?? '(삭제됨)'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                    {t.dueAt && <span>마감 {formatKst(t.dueAt)}</span>}
                    <span>예상 {t.estimatedMinutes}분</span>
                    <span>실제 {totalActual}분</span>
                  </div>
                  {blockedReasons.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-destructive">
                      <Prompt className="text-destructive">! </Prompt>
                      {blockedReasons.join(', ')}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}