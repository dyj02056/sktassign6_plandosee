import { db } from '@/db';
import { task, executionLog, reviewNote } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { computeAggregates } from '@/lib/aggregate';
import { AggregateGrid } from './AggregateGrid';
import { ReviewNoteForm } from './ReviewNoteForm';
import { ReviewNoteList } from './ReviewNoteList';

type Props = {
  planId: string;
};

export async function ReviewTab({ planId }: Props) {
  // 1. 이 계획의 Task (지우지 않은 것)
  const tasks = await db
    .select()
    .from(task)
    .where(and(eq(task.planId, planId), isNull(task.deletedAt)));

  // 2. 그 Task들의 실행 기록
  const taskIds = tasks.map((t) => t.id);
  const executions =
    taskIds.length > 0
      ? await db
          .select()
          .from(executionLog)
          .where(inArray(executionLog.taskId, taskIds))
      : [];

  // 3. 집계 (P4-1 검증 함수)
  const aggregates = computeAggregates(tasks, executions);

  // 4. 이 계획의 고칠 점
  const notes = await db
    .select()
    .from(reviewNote)
    .where(eq(reviewNote.planId, planId));

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-sm font-medium">이 계획의 집계</h2>
        <AggregateGrid aggregates={aggregates} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">다음 계획으로</h2>
        <ReviewNoteList notes={notes} />
        <ReviewNoteForm planId={planId} />
      </section>
    </div>
  );
}