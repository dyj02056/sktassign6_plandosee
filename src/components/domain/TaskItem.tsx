import type { InferSelectModel } from 'drizzle-orm';
import { task, executionLog } from '@/db/schema';
import { ExecutionForm } from './ExecutionForm';

type Task = InferSelectModel<typeof task>;
type Execution = InferSelectModel<typeof executionLog>;

type Props = {
  task: Task;
  executions: Execution[];
};

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

export function TaskItem({ task: t, executions }: Props) {
  const isDone = t.completedAt !== null;
  const totalActual = executions.reduce((sum, e) => sum + e.durationMinutes, 0);
  const hasBlocked = executions.some((e) => e.blockedReason);

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
          {t.title}
        </h3>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {isDone ? '완료' : '진행 중'}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
        {t.dueAt && <span>마감 {formatKst(t.dueAt)}</span>}
        <span>예상 {t.estimatedMinutes}분</span>
        <span>실제 {totalActual}분</span>
        {hasBlocked && (
          <span className="text-destructive">막힘 있음</span>
        )}
      </div>

      {executions.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5 border-l-2 border-muted pl-3">
          {executions.map((e) => (
            <li key={e.id} className="text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">
                  {formatKst(e.startedAt)} ~ {formatKst(e.endedAt)}
                </span>
                <span className="shrink-0 font-mono">{e.durationMinutes}분</span>
              </div>
              {e.blockedReason && (
                <p className="mt-0.5 text-destructive">
                  막힘: {e.blockedReason}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3">
        <ExecutionForm taskId={t.id} />
      </div>
    </li>
  );
}