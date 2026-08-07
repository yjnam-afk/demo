import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { isAuthenticated } from '@/lib/auth/session';
import { storeStatus } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

/**
 * 지금 보고 있는 배포가 어느 것인지.
 *
 * "연결한 환경과 같은 주소를 보고 있는가" 는 점검 목록에 적어 놔도 확인할
 * 방법이 없으면 확인할 수 없다. 한 저장소로 프로젝트를 두 개 만들었거나,
 * Production 에만 연결하고 Preview 주소를 보고 있는 경우가 여기서 갈린다.
 * Vercel 이 넣어 주는 값을 그대로 적어 대시보드와 눈으로 맞춰 보게 한다.
 *
 * 값이 없으면(사내 서버·로컬) 아무것도 내지 않는다.
 */
function deploymentLine(): string | null {
  if (!process.env.VERCEL) return null;

  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const parts = [
    process.env.VERCEL_ENV && `환경 ${process.env.VERCEL_ENV}`,
    process.env.VERCEL_GIT_COMMIT_REF && `브랜치 ${process.env.VERCEL_GIT_COMMIT_REF}`,
    sha && `커밋 ${sha.slice(0, 7)}`,
    process.env.VERCEL_URL,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * 저장 불가 안내.
 *
 * 저장이 막힌 것을 저장 버튼을 눌러야 알게 되면 폼을 다 채운 뒤에 헛수고였음을
 * 안다. 화면을 여는 순간 먼저 알리고, 무엇을 해야 하는지까지 적는다.
 */
function ReadOnlyNotice({ label, hint }: { label: string; hint?: string }) {
  const deployment = deploymentLine();

  return (
    <div className="border-b border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-[var(--color-signal-warn)]">
        <p className="font-medium">읽기 전용 환경입니다. 저장이 되지 않습니다.</p>
        <p className="mt-1 leading-relaxed">
          지금 이 배포는 <span className="font-medium">{label}</span> 을(를) 쓰고 있습니다.
        </p>
        {/* 실제로 확인한 사실을 먼저 놓는다. 점검 목록은 그다음이다. */}
        {hint ? <p className="mt-1 leading-relaxed">{hint}</p> : null}
        {/*
          "연결했는데 왜 안 되지" 가 가장 오래 걸린다. 환경 변수는 배포 시점에
          굳으므로 연결만으로는 반영되지 않고, Vercel 은 Production 과 Preview 의
          환경 변수를 따로 관리한다.
        */}
        <ul className="mt-2 flex flex-col gap-0.5 leading-relaxed">
          <li>· Blob 저장소를 <span className="font-medium">이 프로젝트</span>에 연결했는지</li>
          <li>
            · 연결한 뒤 <span className="font-medium">다시 배포</span>했는지 (환경 변수는 배포
            시점에 굳습니다)
          </li>
          <li>
            · 지금 보고 있는 주소가 연결한 환경과 같은지 (Production 과 Preview 는 환경 변수가
            따로입니다)
          </li>
        </ul>
        {/* 마지막 항목은 값을 보여 줘야 확인이 된다. 대시보드에서 고른 것과 맞춰 본다. */}
        {deployment ? (
          <p className="numeric mt-2 text-xs opacity-80">지금 이 화면 · {deployment}</p>
        ) : null}
      </div>
    </div>
  );
}

/** 저장이 되는 환경에서도 어디에 쌓이는지는 밝힌다. 옮길 때 확인할 근거가 된다. */
function StoreBadge({ label }: { label: string }) {
  return (
    <div className="border-b border-ink-200 bg-white">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-xs text-ink-500">저장 위치 · {label}</p>
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
      {store.writable ? (
        <StoreBadge label={store.label} />
      ) : (
        <ReadOnlyNotice label={store.label} hint={store.hint} />
      )}
      {children}
    </>
  );
}
