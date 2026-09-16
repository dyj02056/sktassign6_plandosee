import Link from 'next/link';
import { db } from '@/db';
import { executionLog, task, plan } from '@/db/schema';
import { desc, inArray } from 'drizzle-orm';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

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
  const logs = await db
    .select()
    .from(executionLog)
    .orderBy(desc(executionLog.startedAt));

  const taskIds = [...new Set(logs.map((l) => l.taskId))];
  const tasks =
    taskIds.length > 0
      ? await db.select().from(task).where(inArray(task.id, taskIds))
      : [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const planIds = [...new Set(tasks.map((t) => t.planId))];
  const plans =
    planIds.length > 0
      ? await db.select().from(plan).where(inArray(plan.id, planIds))
      : [];
  const planMap = new Map(plans.map((p) => [p.id, p]));

  const totalMinutes = logs.reduce((s, l) => s + l.durationMinutes, 0);

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

      <div className="mb-8">
        <SectionTitle className="text-base">logs</SectionTitle>
        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
          {logs.length}건 · 총 {totalMinutes}분
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            아직 실행 기록이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {logs.map((log) => {
            const t = taskMap.get(log.taskId);
            const p = t ? planMap.get(t.planId) : undefined;

            return (
              <li key={log.id} className="py-3.5">
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                  <span className="min-w-0">
                    <span className="truncate font-medium">
                      {t?.title ?? '(삭제된 할 일)'}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {p?.title ?? '(삭제됨)'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-brand">
                    {log.durationMinutes}분
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                  {formatKst(log.startedAt)} ~ {formatKst(log.endedAt)}
                </div>
                {log.blockedReason && (
                  <p className="mt-1 font-mono text-xs text-destructive">
                    <Prompt className="text-destructive">! </Prompt>
                    {log.blockedReason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}