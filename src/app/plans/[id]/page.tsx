import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { db } from '@/db';
import { plan, planRevision } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PlanForm } from '@/components/domain/PlanForm';
import { PlanTabs } from '@/components/domain/PlanTabs';
import { RevisionList } from '@/components/domain/RevisionList';
import { TaskList } from '@/components/domain/TaskList';
import { ReviewTab } from '@/components/domain/ReviewTab';
import { DeletePlanButton } from '@/components/domain/DeletePlanButton';


type Props = {
  params: Promise<{ id: string }>;
};

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;

  const [planRow] = await db.select().from(plan).where(eq(plan.id, id));

  if (!planRow) {
    notFound();
  }

  const revisions = await db
    .select()
    .from(planRevision)
    .where(eq(planRevision.planId, id))
    .orderBy(desc(planRevision.revisedAt));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          계획 목록
        </Link>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {planRow.title}
        </h1>
        <DeletePlanButton planId={planRow.id} planTitle={planRow.title} />
      </div>

      <PlanTabs
        revisionCount={revisions.length}
        currentContent={
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-4 text-sm font-medium">계획</h2>
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