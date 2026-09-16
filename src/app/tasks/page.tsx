import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { db } from '@/db';
import { task, executionLog, plan } from '@/db/schema';
import { eq, and, isNull, isNotNull, inArray, desc } from 'drizzle-orm';
import { isOverdue } from '@/lib/time';

type Filter = 'active' | 'done' | 'overdue' | 'blocked' | 'all';

const FILTER_LABEL: Record<Filter, string> = {
  active: '전체',
  done: '완료',
  overdue: '지연',
  blocked: '막힘',
  all: '전체 (예상 시간)',
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

  // 1. 기본 조건: 지우지 않은 Task
  let whereCondition = isNull(task.deletedAt);

  if (filter === 'done') {
    whereCondition = and(isNull(task.deletedAt), isNotNull(task.completedAt))!;
  } else if (filter === 'overdue' || filter === 'blocked') {
    // overdue, blocked는 아래에서 필터 (KST 계산 / 실행 기록 조인 필요)
    whereCondition = isNull(task.deletedAt);
  }

  // 2. Task 조회
  const allTasks = await db
    .select()
    .from(task)
    .where(whereCondition)
    .orderBy(desc(task.createdAt));

  // 3. 계획 정보 (planId → title)
  const planIds = [...new Set(allTasks.map((t) => t.planId))];
  const plans =
    planIds.length > 0
      ? await db.select().from(plan).where(inArray(plan.id, planIds))
      : [];
  const planTitleMap = new Map(plans.map((p) => [p.id, p.title]));

  // 4. 실행 기록
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

  // 5. filter 적용
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
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          돌아보기
        </Link>
      </header>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          할 일: {FILTER_LABEL[filter]}
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {filtered.length}건
        </p>
      </div>

      {/* 필터 탭 */}
      <nav className="mb-6 flex flex-wrap gap-1 border-b pb-2">
        {FILTER_ORDER.map((f) => (
          <Link
            key={f}
            href={`/tasks?filter=${f}`}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              f === filter
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            이 조건에 맞는 할 일이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((t) => {
            const exs = executionsByTask.get(t.id) ?? [];
            const totalActual = exs.reduce((s, e) => s + e.durationMinutes, 0);
            const isDone = t.completedAt !== null;
            const isOver = isOverdue(t.dueAt, t.completedAt);
            const blockedReasons = exs
              .map((e) => e.blockedReason)
              .filter((r): r is string => !!r && r.trim() !== '');

            return (
              <li key={t.id} className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    className={`font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {t.title}
                  </h2>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {isDone ? '완료' : isOver ? '지연' : '진행 중'}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span>
                    계획: {planTitleMap.get(t.planId) ?? '(삭제됨)'}
                  </span>
                  {t.dueAt && <span>마감 {formatKst(t.dueAt)}</span>}
                  <span>예상 {t.estimatedMinutes}분</span>
                  <span>실제 {totalActual}분</span>
                </div>

                {blockedReasons.length > 0 && (
                  <div className="mt-2 text-xs text-destructive">
                    막힘: {blockedReasons.join(', ')}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}