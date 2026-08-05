import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { isAuthenticated } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * 관리자 관문.
 *
 * 이 레이아웃 아래의 모든 화면이 로그인을 요구한다. API 라우트는 별도로
 * requireAdminApi 가 막는다 — 화면만 막으면 라우트를 직접 호출해 우회할 수 있다.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect('/admin/login');

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
