'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  planId: string;
};

export function TaskForm({ planId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          title,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          estimatedMinutes,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '저장에 실패했습니다');
        setSaving(false);
        return;
      }

      setTitle('');
      setDueAt('');
      setEstimatedMinutes(0);
      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">할 일 추가</h3>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="task-title" className="text-xs">
            제목
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 운동 30분"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="task-due" className="text-xs">
              마감일 (선택)
            </Label>
            <Input
              id="task-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-est" className="text-xs">
              예상 시간 (분)
            </Label>
            <Input
              id="task-est"
              type="number"
              min={0}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? '저장 중...' : '할 일 추가'}
          </Button>
        </div>
      </div>
    </form>
  );
}