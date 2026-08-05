import Link from 'next/link';
import { Suspense } from 'react';
import { MainNav } from '@/components/site/MainNav';
import { BRAND } from '@/lib/brand';

function Header() {
  return (
    // 헤더는 히어로와 같은 색이다. 스크롤 전에는 경계가 보이지 않다가
    // 본문 구간으로 넘어가면 자연스럽게 분리된다.
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/95 backdrop-blur">
      {/*
        높이는 본사 사이트의 GNB 에 맞춰 잡는다. 하위 사이트만 헤더가 얕으면
        본사에서 넘어온 방문자에게 다른 사이트로 읽힌다.
      */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20">
        {/*
          워드마크와 포털 이름은 구분선으로 나눈다. 나란히만 두면 "INFINIQ
          기술 데모 포털" 이라는 하나의 제품명으로 읽혀, 본사와 하위 사이트의
          관계가 드러나지 않는다.
        */}
        <Link href="/" className="flex items-center gap-2.5">
          {/* 로고 슬롯 — 실제 심볼 이미지가 오면 이 마크를 <img> 로 교체한다 */}
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-sm bg-[var(--color-brand-bright)]"
          />
          <span className="text-base font-semibold tracking-tight text-white">
            {BRAND.shortName}
          </span>
          <span aria-hidden className="hidden h-4 w-px bg-white/20 sm:inline-block" />
          <span className="hidden text-sm text-ink-300 sm:inline">{BRAND.productName}</span>
        </Link>

        {/*
          보기 기준 전환은 GNB 에서만 한다. 헤더가 고정되어 있어 본문 어디서든
          닿으므로, 본문에 같은 전환 버튼을 두면 같은 일을 하는 조작이 둘이 된다.
          useSearchParams 를 쓰므로 Suspense 로 감싼다.
        */}
        <Suspense fallback={<div className="h-8" />}>
          <MainNav />
        </Suspense>
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
            <p className="mt-1 max-w-xl text-sm text-ink-500">{BRAND.positioning}</p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-500">
              {BRAND.companyFacts.map((fact) => (
                <span key={fact.label}>
                  {fact.label} <span className="text-ink-300">{fact.value}</span>
                </span>
              ))}
            </div>
          </div>
          {/* 헤더의 본사 링크는 좁은 화면에서 숨으므로 푸터에서 항상 노출한다. */}
          <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
            <a
              href={BRAND.site.url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-300 hover:text-white"
            >
              {BRAND.site.label} ↗
            </a>
            <a
              href={`mailto:${BRAND.contact.email}`}
              className="text-ink-300 underline underline-offset-4 hover:text-white"
            >
              {BRAND.contact.email}
            </a>
          </div>
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
