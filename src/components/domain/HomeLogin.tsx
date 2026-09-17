'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HomeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('[login] 1. attempting signIn with:', email);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('[login] 2. result:', result);

      if (result?.error) {
        console.log('[login] 3. error branch, error =', result.error);
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
        setLoading(false);
        return;
      }

      console.log('[login] 4. success, hard redirect to /');
      // ★ 하드 리다이렉트로 쿠키 반영 확실히
      window.location.href = '/';
    } catch (err) {
      console.error('[login] 5. exception:', err);
      setError('로그인 중 오류가 발생했습니다');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="font-mono text-xs text-muted-foreground mb-4 text-center">
        $ plandosee --login
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-center">
        로그인
      </h1>
      <p className="mb-8 text-sm text-muted-foreground text-center">
        로그인 후 내 기록을 확인할 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">비밀번호</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/signup" className="text-sm underline">
          회원가입
        </Link>
      </div>
    </main>
  );
}