'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch('/api/admin/auth', { method: 'DELETE' });
        router.replace('/admin/login');
        router.refresh();
      }}
      className="text-sm text-ink-500 hover:text-ink-900 disabled:opacity-60"
    >
      로그아웃
    </button>
  );
}
