'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  taskId: string;
};

function diffMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 60000);
}

export function ExecutionForm({ taskId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [blockedReason, setBlockedReason] = useState('');

  // 시작/종료가 바뀌면 소요 시간 자동 계산
  useEffect(() => {
    if (startedAt && endedAt) {
      const d = diffMinutes(startedAt, endedAt);
      if (d > 0) setDurationMinutes(d);
    }
  }, [startedAt, endedAt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date(endedAt).toISOString(),
          durationMinutes,
          blockedReason: blockedReason.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '저장에 실패했습니다');
        setSaving(false);
        return;
      }

      setStartedAt('');
      setEndedAt('');
      setDurationMinutes(0);
      setBlockedReason('');
      setOpen(false);
      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
      >
        + 실행 기록 추가
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-medium">실행 기록</h4>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`start-${taskId}`} className="text-xs">
              시작
            </Label>
            <Input
              id={`start-${taskId}`}
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`end-${taskId}`} className="text-xs">
              종료
            </Label>
            <Input
              id={`end-${taskId}`}
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`dur-${taskId}`} className="text-xs">
            걸린 시간 (분)
          </Label>
          <Input
            id={`dur-${taskId}`}
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`blocked-${taskId}`} className="text-xs">
            막힌 이유 (선택)
          </Label>
          <Textarea
            id={`blocked-${taskId}`}
            value={blockedReason}
            onChange={(e) => setBlockedReason(e.target.value)}
            rows={2}
            placeholder="막힌 게 없으면 비워두세요"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? '저장 중...' : '기록 저장'}
          </Button>
        </div>
      </div>
    </form>
  );
}