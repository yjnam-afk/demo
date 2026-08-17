import { SiteHeader } from '@/components/site/SiteHeader';
import { RevealManager } from '@/components/ui/Reveal';
import { BRAND } from '@/lib/brand';

function Footer() {
  return (
    // 상단 여백을 두지 않는다 — 앞 구간이 어두우면 사이에 밝은 띠가 생겨
    // 이어진 화면이 끊겨 보인다. 여백은 각 화면의 마지막 구간이 책임진다.
    <footer className="bg-ink-950">
      {/*
        푸터는 저작권 한 줄만 진다. 본사 링크는 GNB 에, 이메일은 도입 문의에,
        회사 소개는 히어로에 이미 있다 — 같은 정보를 바닥에 한 번 더 깔면
        푸터가 정리 안 된 서랍이 된다.
      */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-ink-500">
          © {new Date().getFullYear()} {BRAND.nameEn} Co., Ltd.
        </p>
      </div>
    </footer>
  );
}

/**
 * 공개 사이트 레이아웃.
 * 관리자 화면(/admin)은 이 껍데기를 쓰지 않는다 — 영업용 헤더·푸터가
 * 관리 작업 화면에 끼어들면 방해만 된다.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* data-reveal 구간 떠오름은 공개 사이트 전용이다 — 관리자 화면에는 없다 */}
      <RevealManager />
      <main>{children}</main>
      <Footer />
    </>
  );
}
