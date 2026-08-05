import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/admin/LogoutButton';
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
      <div className="border-b border-ink-300 bg-white">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-ink-600 hover:text-ink-900">
              기술 목록
            </Link>
            <Link href="/admin/tech/new" className="text-ink-600 hover:text-ink-900">
              기술 등록
            </Link>
            <Link href="/admin/solutions" className="text-ink-600 hover:text-ink-900">
              솔루션 시나리오
            </Link>
            <Link href="/" className="text-ink-400 hover:text-ink-900">
              공개 사이트 보기 ↗
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </div>
      {children}
    </>
  );
}
