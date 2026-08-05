'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? '로그인하지 못했습니다.');
        return;
      }

      // 세션 쿠키가 붙은 뒤 서버 컴포넌트를 다시 그려야 관문을 통과한다.
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('서버에 연결하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-ink-300 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-600">아이디</span>
        <input
          value={user}
          onChange={(event) => setUser(event.target.value)}
          autoComplete="username"
          required
          className="rounded border border-ink-300 px-3 py-2 focus:border-ink-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-600">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="rounded border border-ink-300 px-3 py-2 focus:border-ink-600 focus:outline-none"
        />
      </label>

      {error ? (
        <p className="text-sm text-[var(--color-signal-fail)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 disabled:opacity-60"
      >
        {pending ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}
