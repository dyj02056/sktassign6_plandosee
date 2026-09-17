'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    // 1. 서버의 sessionVersion 올려서 이전 토큰 무효화 (T07-C114)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[logout] sessionVersion increment failed', err);
    }

    // 2. 클라이언트 쿠키 삭제 + 로그인 화면으로
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? '로그아웃 중...' : '로그아웃'}
    </Button>
  );
}