import type { InferSelectModel } from 'drizzle-orm';
import { task, executionLog } from '@/db/schema';
import { ExecutionForm } from './ExecutionForm';
import { CompleteButton } from './CompleteButton';
import { DeleteTaskButton } from './DeleteTaskButton';
import { Prompt } from './Prompt';

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
  const isOver = !isDone && t.dueAt && new Date(t.dueAt) < new Date();

  return (
    <li className="border-b border-border py-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3">
        {/* 상태 체크박스 */}
        <span
          className={`font-mono text-sm ${
            isDone ? 'text-brand' : isOver ? 'text-amber-400' : 'text-muted-foreground'
          }`}
          aria-label={isDone ? '완료' : isOver ? '지연' : '진행 중'}
        >
          {isDone ? '[✓]' : isOver ? '[!]' : '[ ]'}
        </span>

        <span className="min-w-0">
          <h3
            className={`truncate font-medium ${
              isDone ? 'text-muted-foreground line-through' : ''
            }`}
          >
            {t.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground tabular-nums">
            {t.dueAt && <span>마감 {formatKst(t.dueAt)}</span>}
            <span>예상 {t.estimatedMinutes}분</span>
            <span>실제 {totalActual}분</span>
            {hasBlocked && <span className="text-destructive">막힘 있음</span>}
          </div>
        </span>

        <div className="flex items-center gap-1">
          <CompleteButton taskId={t.id} completed={isDone} />
          <DeleteTaskButton taskId={t.id} taskTitle={t.title} />
        </div>
      </div>

      {executions.length > 0 && (
        <ol className="mt-3 ml-8 flex flex-col gap-1 border-l border-border pl-3">
          {executions.map((e) => (
            <li key={e.id} className="font-mono text-xs">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
                <span className="text-muted-foreground tabular-nums">
                  {formatKst(e.startedAt)} ~ {formatKst(e.endedAt)}
                </span>
                <span className="shrink-0 tabular-nums">{e.durationMinutes}분</span>
              </div>
              {e.blockedReason && (
                <p className="mt-0.5 text-destructive">
                  <Prompt className="text-destructive">! </Prompt>
                  {e.blockedReason}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 ml-8">
        <ExecutionForm taskId={t.id} />
      </div>
    </li>
  );
}