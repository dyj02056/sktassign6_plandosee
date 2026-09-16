import Link from 'next/link';
import type { Aggregates } from '@/lib/aggregate';

type Props = {
  aggregates: Aggregates;
};

type CardDef = {
  label: string;
  value: string;
  href: string;
  hint?: string;
};

export function AggregateGrid({ aggregates }: Props) {
  const {
    planCount,
    doneCount,
    overdueCount,
    blockedCount,
    estimatedMinutes,
    actualMinutes,
    diffMinutes,
  } = aggregates;

  const cards: CardDef[] = [
    {
      label: '계획 수',
      value: `${planCount}`,
      href: '/tasks?filter=active',
    },
    {
      label: '완료 수',
      value: `${doneCount}`,
      href: '/tasks?filter=done',
    },
    {
      label: '지연 수',
      value: `${overdueCount}`,
      href: '/tasks?filter=overdue',
    },
    {
      label: '막힘 수',
      value: `${blockedCount}`,
      href: '/tasks?filter=blocked',
    },
    {
      label: '예상 시간',
      value: `${estimatedMinutes}분`,
      href: '/tasks?filter=all',
    },
    {
      label: '실제 시간',
      value: `${actualMinutes}분`,
      href: '/logs',
    },
    {
      label: '차이',
      value: `${diffMinutes > 0 ? '+' : ''}${diffMinutes}분`,
      href: '/logs',
      hint: diffMinutes > 0 ? '예상보다 많이 걸림' : diffMinutes < 0 ? '예상보다 적게 걸림' : '예상과 일치',
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          >
            <div className="text-xs text-muted-foreground">{card.label}</div>
            <div className="mt-1.5 font-mono text-xl font-medium tabular-nums">
              {card.value}
            </div>
            {card.hint && (
              <div className="mt-1 text-xs text-muted-foreground">
                {card.hint}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}