'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

type Props = {
  taskId: string;
  taskTitle: string;
};

export function DeleteTaskButton({ taskId, taskTitle }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '삭제에 실패했습니다');
        setSaving(false);
        return;
      }

      setConfirming(false);
      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-xs text-muted-foreground hover:text-destructive"
        aria-label="할 일 삭제"
      >
        <Trash size={14} />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg">
        <h3 className="font-medium">할 일을 지울까요?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          &ldquo;{taskTitle}&rdquo;을(를) 목록에서 지웁니다. 돌아보기 집계에서도 빠집니다.
        </p>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? '지우는 중...' : '지우기'}
          </Button>
        </div>
      </div>
    </div>
  );
}