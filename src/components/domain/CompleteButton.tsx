'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

type Props = {
  taskId: string;
  completed: boolean;
};

export function CompleteButton({ taskId, completed }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 완료된 Task는 버튼 비활성 (UX)
  // 단, 보장은 서버의 조건부 UPDATE가 담당 (C21)
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check size={12} weight="bold" />
        완료됨
      </span>
    );
  }

  async function handleClick() {
    if (saving) return; // UX 잠금 (보장은 아님)
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '완료 처리에 실패했습니다');
        setSaving(false);
        return;
      }

      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={saving}
      >
        <Check size={14} weight="bold" />
        {saving ? '처리 중...' : '완료'}
      </Button>
    </div>
  );
}