import { db } from '@/db';
import { task, executionLog } from '@/db/schema';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';

type Props = {
  planId: string;
};

export async function TaskList({ planId }: Props) {
  // 1. 이 계획의 할 일 (지우지 않은 것)
  const tasks = await db
    .select()
    .from(task)
    .where(and(eq(task.planId, planId), isNull(task.deletedAt)))
    .orderBy(desc(task.createdAt));

  // 2. 그 할 일들의 실행 기록 (한 번에)
  const taskIds = tasks.map((t) => t.id);
  const executions =
    taskIds.length > 0
      ? await db
          .select()
          .from(executionLog)
          .where(inArray(executionLog.taskId, taskIds))
          .orderBy(desc(executionLog.startedAt))
      : [];

  // 3. taskId별로 묶기
  const executionsByTask = new Map<string, typeof executions>();
  for (const e of executions) {
    const list = executionsByTask.get(e.taskId) ?? [];
    list.push(e);
    executionsByTask.set(e.taskId, list);
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">할 일</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {tasks.length}개
        </span>
      </header>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            아직 할 일이 없습니다. 계획을 세부 할 일로 나눠보세요.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              executions={executionsByTask.get(t.id) ?? []}
            />
          ))}
        </ul>
      )}

      <TaskForm planId={planId} />
    </section>
  );
}