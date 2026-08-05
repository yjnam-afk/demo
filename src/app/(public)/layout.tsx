import Link from 'next/link';
import { BRAND } from '@/lib/brand';

function Header() {
  return (
    // 헤더는 히어로와 같은 색이다. 스크롤 전에는 경계가 보이지 않다가
    // 본문 구간으로 넘어가면 자연스럽게 분리된다.
    <header className="sticky top-0 z-20 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* 로고 슬롯 — 실제 심볼 이미지가 오면 이 마크를 <img> 로 교체한다 */}
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-sm bg-[var(--color-brand-bright)]"
          />
          <span className="text-base font-semibold tracking-tight text-white">
            {BRAND.shortName}
          </span>
          <span className="hidden text-sm text-ink-400 sm:inline">{BRAND.productName}</span>
        </Link>

        {/*
          GNB 는 세 가지 보기 기준만 노출한다.
          메뉴는 서로 다른 목록이 아니라 같은 카탈로그를 여는 각각의 입구이며,
          어느 쪽으로 들어와도 화면 안에서 기준을 바꿀 수 있다.

          솔루션 시나리오는 메뉴에 두지 않는다 — "시나리오"라는 말만으로는
          무엇인지 알 수 없고, 제품별 보기 안에 이미 함께 나온다.
        */}
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <Link
            href="/tech?view=product"
            className="text-ink-300 transition-colors hover:text-white"
          >
            제품
          </Link>
          <Link href="/tech?view=tech" className="text-ink-300 transition-colors hover:text-white">
            기술
          </Link>
          <Link
            href="/tech?view=industry"
            className="text-ink-300 transition-colors hover:text-white"
          >
            산업
          </Link>
          <Link
            href="/#contact"
            className="rounded bg-white px-3.5 py-1.5 font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    // 상단 여백을 두지 않는다 — 앞 구간이 어두우면 사이에 밝은 띠가 생겨
    // 이어진 화면이 끊겨 보인다. 여백은 각 화면의 마지막 구간이 책임진다.
    <footer className="bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-2.5">
              <p className="text-base font-semibold text-white">{BRAND.name}</p>
              <p className="text-sm tracking-wide text-[var(--color-brand-bright)]">
                {BRAND.slogan}
              </p>
            </div>
            <p className="mt-1.5 text-sm text-ink-400">{BRAND.tagline}</p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-500">
              {BRAND.companyFacts.map((fact) => (
                <span key={fact.label}>
                  {fact.label} <span className="text-ink-300">{fact.value}</span>
                </span>
              ))}
            </div>
          </div>
          <a
            href={`mailto:${BRAND.contact.email}`}
            className="text-sm text-ink-300 underline underline-offset-4 hover:text-white"
          >
            {BRAND.contact.email}
          </a>
        </div>

        <p className="border-t border-white/10 pt-6 text-xs leading-relaxed text-ink-500">
          표기된 성능 지표는 각 항목에 명시된 평가 데이터셋과 측정 조건에서 얻은 결과입니다.
          도입 환경에 따라 실제 성능은 달라질 수 있습니다.
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
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
