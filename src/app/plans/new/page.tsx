import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { PlanForm } from '@/components/domain/PlanForm';

export default function NewPlanPage() {
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

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        새 계획
      </h1>

      <PlanForm mode="create" />
    </main>
  );
}