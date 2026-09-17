'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/delete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? '계정 삭제에 실패했습니다');
        setLoading(false);
        setConfirming(false);
        return;
      }
      // 삭제 성공 → 자동 로그아웃 → 로그인 화면
      await signOut({ callbackUrl: '/login' });
    } catch {
      alert('네트워크 오류가 발생했습니다');
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10"
      >
        계정 삭제
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm text-destructive">
        정말 삭제하시겠습니까? 되돌릴 수 없습니다.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? '삭제 중...' : '삭제 확인'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    </div>
  );
}