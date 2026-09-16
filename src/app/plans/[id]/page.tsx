import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { plan, planRevision } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PlanForm } from '@/components/domain/PlanForm';
import { PlanTabs } from '@/components/domain/PlanTabs';
import { RevisionList } from '@/components/domain/RevisionList';
import { TaskList } from '@/components/domain/TaskList';
import { ReviewTab } from '@/components/domain/ReviewTab';
import { DeletePlanButton } from '@/components/domain/DeletePlanButton';
import { Prompt, SectionTitle } from '@/components/domain/Prompt';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;

  const [planRow] = await db.select().from(plan).where(eq(plan.id, id));

  if (!planRow || planRow.deletedAt) {
    notFound();
  }

  const revisions = await db
    .select()
    .from(planRevision)
    .where(eq(planRevision.planId, id))
    .orderBy(desc(planRevision.revisedAt));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-6">
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
        >
          ← home
        </Link>
      </header>
      <header className="mb-8">
        <Link
          href="/plans"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-brand"
        >
          ← /plans
        </Link>
      </header>

      <div className="mb-8 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">
            <Prompt>$ </Prompt>
            cat plan:{planRow.id.slice(0, 8)}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
            {planRow.title}
          </h1>
        </div>
        <DeletePlanButton planId={planRow.id} planTitle={planRow.title} />
      </div>

      <PlanTabs
        revisionCount={revisions.length}
        currentContent={
          <div className="flex flex-col gap-10">
            <section>
              <SectionTitle className="mb-4">계획</SectionTitle>
              <PlanForm
                mode="edit"
                planId={planRow.id}
                initial={{
                  title: planRow.title,
                  periodStart: planRow.periodStart,
                  periodEnd: planRow.periodEnd,
                  priority: planRow.priority,
                  successCriteria: planRow.successCriteria,
                  estimatedMinutes: planRow.estimatedMinutes,
                }}
              />
            </section>

            <TaskList planId={planRow.id} />
          </div>
        }
        revisionContent={<RevisionList revisions={revisions} />}
        reviewContent={<ReviewTab planId={planRow.id} />}
      />
    </main>
  );
}

