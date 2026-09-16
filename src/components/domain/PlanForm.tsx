'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type PlanFormValues = {
  title: string;
  periodStart: string;
  periodEnd: string;
  priority: 'low' | 'medium' | 'high';
  successCriteria: string;
  estimatedMinutes: number;
};

type Props = {
  initial?: Partial<PlanFormValues>;
  mode: 'create' | 'edit';
  planId?: string;
};

const PRIORITY_OPTIONS: { value: PlanFormValues['priority']; label: string }[] = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
];

export function PlanForm({ initial, mode, planId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<PlanFormValues>({
    title: initial?.title ?? '',
    periodStart: initial?.periodStart ?? '',
    periodEnd: initial?.periodEnd ?? '',
    priority: initial?.priority ?? 'medium',
    successCriteria: initial?.successCriteria ?? '',
    estimatedMinutes: initial?.estimatedMinutes ?? 0,
  });

  function update<K extends keyof PlanFormValues>(key: K, v: PlanFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = mode === 'create' ? '/api/plans' : `/api/plans/${planId}`;
    const method = mode === 'create' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '저장에 실패했습니다');
        setSaving(false);
        return;
      }

      if (mode === 'create') {
        router.push(`/plans/${json.id}`);
      } else {
        router.refresh();
      }
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="periodStart">시작일</Label>
          <Input
            id="periodStart"
            type="date"
            value={values.periodStart}
            onChange={(e) => update('periodStart', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="periodEnd">종료일</Label>
          <Input
            id="periodEnd"
            type="date"
            value={values.periodEnd}
            onChange={(e) => update('periodEnd', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="priority">우선순위</Label>
        <select
          id="priority"
          value={values.priority}
          onChange={(e) => update('priority', e.target.value as PlanFormValues['priority'])}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="successCriteria">성공 기준</Label>
        <Textarea
          id="successCriteria"
          value={values.successCriteria}
          onChange={(e) => update('successCriteria', e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="estimatedMinutes">예상 시간 (분)</Label>
        <Input
          id="estimatedMinutes"
          type="number"
          min={0}
          value={values.estimatedMinutes}
          onChange={(e) => update('estimatedMinutes', Number(e.target.value))}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? '저장 중...' : mode === 'create' ? '계획 만들기' : '저장'}
        </Button>
      </div>
    </form>
  );
}