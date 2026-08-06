'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  CATALOG_VIEWS,
  DEFAULT_VIEW,
  VIEW_LABELS,
  isCatalogView,
} from '@/components/tech/catalogView';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/ui/domain';

/**
 * 주 메뉴.
 *
 * 보기 기준 전환을 여기서만 한다. GNB 가 화면 상단에 고정되어 있으므로
 * 본문에 같은 전환 버튼을 한 번 더 두면 같은 일을 하는 조작이 두 개가 된다.
 *
 * 현재 어느 기준을 보고 있는지 메뉴에 표시해야 전환 수단으로 읽힌다.
 * 표시가 없으면 그냥 링크 목록으로 보인다.
 */
export function MainNav() {
  const pathname = usePathname();
  const params = useSearchParams();

  const viewParam = params.get('view');
  const activeView =
    pathname === '/tech' ? (isCatalogView(viewParam) ? viewParam : DEFAULT_VIEW) : null;

  return (
    <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
      {CATALOG_VIEWS.map((view) => {
        const active = activeView === view;
        return (
          <Link
            key={view}
            href={`/tech?view=${view}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              // 활성 표시는 배경이 아니라 아래 밑줄로 준다. 기업 사이트 GNB 는
              // 메뉴에 배경 블록을 깔지 않아, 배경을 쓰면 이 사이트만 튄다.
              'relative px-2.5 py-2 transition-colors sm:px-3.5',
              active ? 'font-medium text-white' : 'text-ink-300 hover:text-white',
            )}
          >
            {VIEW_LABELS[view]}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--color-brand-bright)] sm:inset-x-3.5"
              />
            ) : null}
          </Link>
        );
      })}

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
