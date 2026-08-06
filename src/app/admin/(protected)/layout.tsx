import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { isAuthenticated } from '@/lib/auth/session';
import { storeStatus } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

/**
 * 저장 불가 안내.
 *
 * 저장이 막힌 것을 저장 버튼을 눌러야 알게 되면 폼을 다 채운 뒤에 헛수고였음을
 * 안다. 화면을 여는 순간 먼저 알리고, 무엇을 해야 하는지까지 적는다.
 */
function ReadOnlyNotice() {
  return (
    <div className="border-b border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-[var(--color-signal-warn)]">
        <p className="font-medium">읽기 전용 환경입니다. 저장이 되지 않습니다.</p>
        <p className="mt-1 leading-relaxed">
          Vercel 은 배포 파일에 쓸 수 없습니다. Vercel 대시보드에서{' '}
          <span className="font-medium">Storage → Create → Blob</span> 으로 저장소를 만들고 이
          프로젝트에 연결한 뒤 재배포하면 저장이 됩니다. 사내 서버에 배포하는 경우에는{' '}
          <code className="rounded bg-white/60 px-1">data/</code> 를 쓰기 가능한 볼륨으로 마운트하면
          됩니다.
        </p>
      </div>
    </div>
  );
}

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

  const store = await storeStatus();

  return (
    <>
      <AdminNav />
      {!store.writable ? <ReadOnlyNotice /> : null}
      {children}
    </>
  );
}
