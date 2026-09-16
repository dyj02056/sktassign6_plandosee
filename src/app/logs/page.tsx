import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { db } from '@/db';
import { executionLog, task, plan } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

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

export default async function LogsPage() {
  // 1. 모든 실행 기록 (최근 순)
  const logs = await db
    .select()
    .from(executionLog)
    .orderBy(desc(executionLog.startedAt));

  // 2. 관련 Task
  const taskIds = [...new Set(logs.map((l) => l.taskId))];
  const tasks =
    taskIds.length > 0
      ? await db.select().from(task).where(inArray(task.id, taskIds))
      : [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // 3. 관련 Plan
  const planIds = [...new Set(tasks.map((t) => t.planId))];
  const plans =
    planIds.length > 0
      ? await db.select().from(plan).where(inArray(plan.id, planIds))
      : [];
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);

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
        <h1 className="text-2xl font-semibold tracking-tight">실행 기록</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {logs.length}건, 총 {totalMinutes}분
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            아직 실행 기록이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => {
            const t = taskMap.get(log.taskId);
            const p = t ? planMap.get(t.planId) : undefined;

            return (
              <li key={log.id} className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-medium">{t?.title ?? '(삭제된 할 일)'}</h2>
                  <span className="shrink-0 font-mono text-xs">
                    {log.durationMinutes}분
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span>계획: {p?.title ?? '(삭제됨)'}</span>
                  <span>
                    {formatKst(log.startedAt)} ~ {formatKst(log.endedAt)}
                  </span>
                </div>

                {log.blockedReason && (
                  <div className="mt-2 text-xs text-destructive">
                    막힘: {log.blockedReason}
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