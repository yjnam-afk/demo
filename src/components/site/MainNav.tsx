'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/ui/domain';

/**
 * 주 메뉴.
 *
 * 메뉴에는 서로 다른 화면으로 가는 문만 둔다. 전에는 카탈로그 보기 전환
 * (기술/산업별)이 여기 있었는데, 같은 기술 목록을 다르게 묶는 조작은
 * 필터가 하는 일과 겹쳐 메뉴가 필터 이상이 되지 못했다. 산업별 묶음
 * 화면(/industries)은 랜딩·상세의 산업 링크로 닿는다.
 *
 * 현재 어느 화면에 있는지 밑줄로 표시해야 이동 수단으로 읽힌다.
 */
export function MainNav() {
  const pathname = usePathname();

  /*
    메뉴는 기술 하나다. 이 포털이 소개하는 대상이 기술이고, 제품은 랜딩의
    제품 구간과 기술 상세의 "이 기술이 들어간 제품" 링크로 닿는다 —
    제품에서 시작하는 이야기는 회사 공식 사이트의 몫이다.
    산업별·제품 화면에 있을 때도 기술 메뉴가 켜진다. 모두 기술을 묶거나
    담은 화면이라, 켜진 메뉴가 없으면 길을 잃은 것처럼 보인다.
  */
  const items = [
    {
      href: '/tech',
      label: '기술',
      active:
        pathname.startsWith('/tech') ||
        pathname.startsWith('/industries') ||
        pathname.startsWith('/products'),
    },
  ];

  return (
    <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
      {items.map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            // 활성 표시는 배경이 아니라 아래 밑줄로 준다. 기업 사이트 GNB 는
            // 메뉴에 배경 블록을 깔지 않아, 배경을 쓰면 이 사이트만 튄다.
            'relative px-2.5 py-2 transition-colors sm:px-3.5',
            active ? 'font-medium text-white' : 'text-ink-300 hover:text-white',
          )}
        >
          {label}
          {active ? (
            <span
              aria-hidden
              className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--color-brand-bright)] sm:inset-x-3.5"
            />
          ) : null}
        </Link>
      ))}

      {/*
        본사 사이트로 돌아가는 길. 하위 사이트에 이것이 없으면 방문자는
        인피닉의 일부인지 별개 서비스인지 알 수 없다.
      */}
      <a
        href={BRAND.site.url}
        target="_blank"
        rel="noreferrer"
        className="ml-1 hidden items-center gap-1 px-3 py-2 text-ink-400 transition-colors hover:text-white lg:flex"
      >
        {BRAND.site.label}
        <span aria-hidden className="text-xs">
          ↗
        </span>
      </a>

      <Link
        href="/#contact"
        className="ml-1.5 rounded bg-white px-3.5 py-2 font-medium text-ink-900 transition-colors hover:bg-ink-200 sm:ml-3"
      >
        {BRAND.contact.label}
      </Link>
    </nav>
  );
}
