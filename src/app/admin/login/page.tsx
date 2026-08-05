import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { isAuthenticated } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  // 이미 로그인한 상태로 다시 들어오면 목록으로 보낸다.
  if (await isAuthenticated()) redirect('/admin');

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="text-lg font-semibold text-ink-900">관리자 로그인</h1>
      <p className="mt-1 text-sm text-ink-500">등록된 관리자 계정으로 로그인하세요.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
