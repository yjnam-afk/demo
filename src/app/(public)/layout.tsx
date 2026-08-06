import Link from 'next/link';
import { Suspense } from 'react';
import { MainNav } from '@/components/site/MainNav';
import { BRAND } from '@/lib/brand';

function Header() {
  return (
    // 헤더는 히어로와 같은 색이다. 스크롤 전에는 경계가 보이지 않다가
    // 본문 구간으로 넘어가면 자연스럽게 분리된다.
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950">
      {/*
        높이는 본사 사이트의 GNB 에 맞춰 잡는다. 하위 사이트만 헤더가 얕으면
        본사에서 넘어온 방문자에게 다른 사이트로 읽힌다.
      */}
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:h-24">
        {/*
          워드마크는 회사 자산 이미지를 쓴다. 글꼴로 흉내 내면 자간과 Q 의
          꼬리가 달라 다른 회사 로고처럼 보인다.
          원본 SVG 를 받으면 public/brand 의 파일만 교체하면 된다.

          포털 이름은 구분선으로 나눈다. 나란히만 두면 "INFINIQ 기술 데모
          포털" 이라는 하나의 제품명으로 읽혀 본사와의 관계가 드러나지 않는다.
        */}
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/infiniq-wordmark.png"
            alt={BRAND.nameEn}
            className="h-5 w-auto sm:h-6"
          />
          <span aria-hidden className="hidden h-5 w-px bg-white/20 sm:inline-block" />
          {/* 부제는 국문 문장이 아니라 표기로 둔다 — 워드마크 옆에서 문장이 되면 무겁다 */}
          <span className="hidden text-xs tracking-[0.18em] text-ink-400 uppercase sm:inline">
            {BRAND.productNameEn}
          </span>
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
