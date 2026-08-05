'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';
import { cn } from '@/lib/ui/domain';

/**
 * 관리자 주 메뉴.
 *
 * 공개 사이트와 같은 규칙을 따른다 — 전환은 메뉴에서만 하고, 지금 어디에
 * 있는지 메뉴에 표시한다. 표시가 없으면 링크 목록으로만 보인다.
 *
 * 관리 대상은 두 가지뿐이다. 산업군·카테고리는 각 등록 화면 안에서 만들므로
 * 별도 메뉴를 두지 않는다.
 */
const ITEMS = [
  { href: '/admin', label: '기술', match: (p: string) => p === '/admin' || p.startsWith('/admin/tech') },
  {
    href: '/admin/solutions',
    label: '제품 · 구성 제안',
    match: (p: string) => p.startsWith('/admin/solutions'),
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-ink-300 bg-white">
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4">
        <nav className="flex items-center gap-1 text-sm">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // 공개 사이트와 같은 방식으로 활성 표시를 준다 — 배경 블록이
                  // 아니라 밑줄. 두 화면의 GNB 가 서로 다른 규칙을 쓰면
                  // 같은 서비스의 앞뒤로 읽히지 않는다.
                  'relative px-3 py-2 transition-colors',
                  active ? 'font-medium text-ink-900' : 'text-ink-600 hover:text-ink-900',
                )}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink-900"
                  />
                ) : null}
              </Link>
            );
          })}
          <Link
            href="/"
            target="_blank"
            className="ml-2 px-2 text-ink-400 transition-colors hover:text-ink-900"
          >
            공개 사이트 ↗
          </Link>
        </nav>
        <LogoutButton />
      </div>
    </div>
  );
}
