import Link from 'next/link';
import type { Aggregates } from '@/lib/aggregate';
import { Prompt } from './Prompt';

type Props = {
  aggregates: Aggregates;
};

type CardDef = {
  label: string;
  value: string;
  href: string;
  hint?: string;
  tone?: 'default' | 'brand' | 'warn' | 'destructive';
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
    { label: '계획 수', value: `${planCount}`, href: '/tasks?filter=active' },
    { label: '완료 수', value: `${doneCount}`, href: '/tasks?filter=done', tone: 'brand' },
    { label: '지연 수', value: `${overdueCount}`, href: '/tasks?filter=overdue', tone: overdueCount > 0 ? 'warn' : 'default' },
    { label: '막힘 수', value: `${blockedCount}`, href: '/tasks?filter=blocked', tone: blockedCount > 0 ? 'destructive' : 'default' },
    { label: '예상 시간', value: `${estimatedMinutes}분`, href: '/tasks?filter=all' },
    { label: '실제 시간', value: `${actualMinutes}분`, href: '/logs' },
    {
      label: '차이',
      value: `${diffMinutes > 0 ? '+' : ''}${diffMinutes}분`,
      href: '/logs',
      hint: diffMinutes > 0 ? '예상 초과' : diffMinutes < 0 ? '예상 이하' : '예상 일치',
      tone: diffMinutes > 0 ? 'warn' : diffMinutes < 0 ? 'brand' : 'default',
    },
  ];

  const toneClass = (tone?: CardDef['tone']) => {
    switch (tone) {
      case 'brand':
        return 'text-brand';
      case 'warn':
        return 'text-amber-400';
      case 'destructive':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  return (
    <ul className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="flex h-full flex-col justify-between bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {card.label}
            </div>
            <div className={`mt-2 font-mono text-2xl tabular-nums ${toneClass(card.tone)}`}>
              {card.value}
            </div>
            {card.hint && (
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                <Prompt className="text-muted-foreground"># </Prompt>
                {card.hint}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}