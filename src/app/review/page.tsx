import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { db } from '@/db';
import { task, executionLog } from '@/db/schema';
import { isNull, inArray } from 'drizzle-orm';
import { computeAggregates } from '@/lib/aggregate';
import { AggregateGrid } from '@/components/domain/AggregateGrid';
import { ExportButton } from '@/components/domain/ExportButton';

export default async function ReviewPage() {
  const tasks = await db.select().from(task).where(isNull(task.deletedAt));

  const taskIds = tasks.map((t) => t.id);
  const executions =
    taskIds.length > 0
      ? await db
          .select()
          .from(executionLog)
          .where(inArray(executionLog.taskId, taskIds))
      : [];

  const aggregates = computeAggregates(tasks, executions);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          홈
        </Link>
      </header>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">돌아보기</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            숫자를 누르면 그 숫자가 나온 기록으로 이동합니다.
          </p>
        </div>
        <ExportButton />
      </div>

      <AggregateGrid aggregates={aggregates} />
    </main>
  );
}