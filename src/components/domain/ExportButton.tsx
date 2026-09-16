'use client';

import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

type Props = {
  variant?: 'default' | 'outline' | 'ghost';
};

export function ExportButton({ variant = 'outline' }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/export');

      if (!res.ok) {
        setError('내보내기에 실패했습니다');
        setSaving(false);
        return;
      }

      // Content-Disposition에서 파일명 추출
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'plandussi-export.json';

      // Blob으로 저장
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('네트워크 오류가 발생했습니다');
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={handleExport}
        disabled={saving}
      >
        <DownloadSimple size={14} weight="bold" />
        {saving ? '내보내는 중...' : '내보내기'}
      </Button>
    </div>
  );
}