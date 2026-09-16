import Link from 'next/link';
import { db } from '@/db';
import { task, executionLog } from '@/db/schema';
import { isNull, inArray } from 'drizzle-orm';
import { computeAggregates } from '@/lib/aggregate';
import { AggregateGrid } from '@/components/domain/AggregateGrid';
import { ExportButton } from '@/components/domain/ExportButton';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

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
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
        >
          ← /
        </Link>
      </header>

      <div className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <SectionTitle className="text-base">review --all</SectionTitle>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            <Prompt className="text-muted-foreground"># </Prompt>
            숫자를 누르면 그 숫자가 나온 기록으로 이동합니다.
          </p>
        </div>
        <ExportButton />
      </div>

      <AggregateGrid aggregates={aggregates} />
    </main>
  );
}