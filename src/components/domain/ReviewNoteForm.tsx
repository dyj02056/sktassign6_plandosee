'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  planId: string;
};

export function ReviewNoteForm({ planId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixNote, setFixNote] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/review/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, fixNote }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '저장에 실패했습니다');
        setSaving(false);
        return;
      }

      setFixNote('');
      router.refresh();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="fixNote">다음 계획으로 넘길 고칠 점</Label>
        <Textarea
          id="fixNote"
          value={fixNote}
          onChange={(e) => setFixNote(e.target.value)}
          rows={2}
          placeholder="예: 예상 시간을 너무 짧게 잡았다. 다음엔 1.5배로."
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? '저장 중...' : '고칠 점 저장'}
        </Button>
      </div>
    </form>
  );
}