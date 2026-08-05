'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CATALOG_VIEWS, VIEW_LABELS, isCatalogView } from '@/components/tech/catalogView';
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
    pathname === '/tech' ? (isCatalogView(viewParam) ? viewParam : 'product') : null;

  return (
    <nav className="flex items-center gap-1 text-sm">
      {CATALOG_VIEWS.map((view) => {
        const active = activeView === view;
        return (
          <Link
            key={view}
            href={`/tech?view=${view}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded px-2.5 py-1.5 transition-colors sm:px-3',
              active ? 'bg-white/10 font-medium text-white' : 'text-ink-300 hover:text-white',
            )}
          >
            {VIEW_LABELS[view]}
          </Link>
        );
      })}

      <Link
        href="/#contact"
        className="ml-2 rounded bg-white px-3.5 py-1.5 font-medium text-ink-900 transition-colors hover:bg-ink-200"
      >
        {BRAND.contact.label}
      </Link>
    </nav>
  );
}
