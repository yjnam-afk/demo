'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { MainNav } from './MainNav';
import { BRAND } from '@/lib/brand';

/**
 * 공개 사이트 GNB.
 *
 * 맨 위에서는 히어로와 같은 불투명 잉크색이다 — 유리는 뒤로 지나가는
 * 내용이 있어야 성립하는데, 스크롤 전의 헤더 뒤는 밝은 바탕뿐이라
 * 유리를 깔면 히어로와 색이 어긋난 회색 판이 된다. 스크롤이 시작되면
 * 유리판으로 바꾼다. 전환 시점의 헤더는 아직 어두운 히어로 위라, 불투명과
 * 유리가 같은 색으로 보여 바뀌는 순간이 눈에 띄지 않는다.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b border-white/5 ${scrolled ? 'glass-dark' : 'bg-ink-950'}`}
    >
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
          <img src="/brand/infiniq-wordmark.png" alt={BRAND.nameEn} className="h-5 w-auto sm:h-6" />
          <span aria-hidden className="hidden h-5 w-px bg-white/20 sm:inline-block" />
          {/* 부제는 국문 문장이 아니라 표기로 둔다 — 워드마크 옆에서 문장이 되면 무겁다 */}
          <span className="hidden text-xs tracking-[0.18em] text-ink-500 uppercase sm:inline">
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
