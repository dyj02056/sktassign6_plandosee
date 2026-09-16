import type { InferSelectModel } from 'drizzle-orm';
import { planRevision } from '@/db/schema';

type Revision = InferSelectModel<typeof planRevision>;

type Snapshot = {
  title?: string;
  periodStart?: string;
  periodEnd?: string;
  priority?: string;
  successCriteria?: string;
  estimatedMinutes?: number;
};

const FIELD_LABEL: Record<string, string> = {
  title: '제목',
  periodStart: '시작일',
  periodEnd: '종료일',
  priority: '우선순위',
  successCriteria: '성공 기준',
  estimatedMinutes: '예상 시간',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

function formatKst(iso: string): string {
  const d = new Date(iso);
  // KST 표시 (Asia/Seoul)
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

function formatValue(field: string, value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (field === 'priority') return PRIORITY_LABEL[String(value)] ?? String(value);
  if (field === 'estimatedMinutes') return `${value}분`;
  return String(value);
}

export function RevisionList({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          아직 수정 이력이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {revisions.map((rev) => {
        const snapshot = rev.snapshot as Snapshot;
        const changed = (rev.changedFields ?? []) as string[];

        return (
          <li key={rev.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                {formatKst(rev.revisedAt as unknown as string)}
              </span>
              {changed.length > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  바뀐 필드: {changed.map((f) => FIELD_LABEL[f] ?? f).join(', ')}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">제목</dt>
              <dd className={changed.includes('title') ? 'font-medium' : ''}>
                {formatValue('title', snapshot.title)}
              </dd>

              <dt className="text-muted-foreground">기간</dt>
              <dd className={changed.includes('periodStart') || changed.includes('periodEnd') ? 'font-medium' : ''}>
                {formatValue('periodStart', snapshot.periodStart)} ~ {formatValue('periodEnd', snapshot.periodEnd)}
              </dd>

              <dt className="text-muted-foreground">우선순위</dt>
              <dd className={changed.includes('priority') ? 'font-medium' : ''}>
                {formatValue('priority', snapshot.priority)}
              </dd>

              <dt className="text-muted-foreground">성공 기준</dt>
              <dd className={changed.includes('successCriteria') ? 'font-medium' : ''}>
                {formatValue('successCriteria', snapshot.successCriteria)}
              </dd>

              <dt className="text-muted-foreground">예상 시간</dt>
              <dd className={changed.includes('estimatedMinutes') ? 'font-medium' : ''}>
                {formatValue('estimatedMinutes', snapshot.estimatedMinutes)}
              </dd>
            </dl>
          </li>
        );
      })}
    </ol>
  );
}