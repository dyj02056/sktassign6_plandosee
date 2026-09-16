import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 터미널 프롬프트 접두어. "$", ">", "▸" 등.
 */
export function Prompt({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn('select-none text-brand', className)}>{children}</span>;
}

/**
 * 섹션 제목: "$ 제목" 형태
 */
export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('text-sm font-medium text-foreground', className)}>
      <Prompt>$ </Prompt>
      {children}
    </h2>
  );
}