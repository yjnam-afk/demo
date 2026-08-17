import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: '관리자',
  // 관리 화면이 검색 결과에 잡히면 안 된다.
  robots: { index: false, follow: false },
};

/**
 * 관리자 구역의 껍데기.
 * 인증은 (protected) 레이아웃이 담당한다 — 로그인 화면은 이 껍데기를 쓰되
 * 관문 밖에 있어야 하기 때문이다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // theme-light — 공개 사이트가 전면 다크여도 관리 화면은 밝은 토큰을 쓴다(globals.css)
    <div className="theme-light min-h-screen bg-ink-100">
      <div className="border-b border-ink-300 bg-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4">
          <span className="text-sm font-semibold text-ink-900">{BRAND.shortName}</span>
          <span className="text-sm text-ink-500">기술 데모 포털 관리자</span>
        </div>
      </div>
      {children}
    </div>
  );
}
