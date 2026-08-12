import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * 헤더 오른쪽.
 *
 * 메뉴는 없다. 이 사이트의 목적지는 하나(기술 목록 = 메인)이고 행동도
 * 하나(도입 문의)다 — 워드마크가 메인으로 돌아가는 길이고, 남는 것은
 * 본사로 가는 문과 문의 버튼뿐이다. 갈 곳이 늘어나는 날 메뉴를 되살린다.
 */
export function MainNav() {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {/*
        본사 사이트로 돌아가는 길. 하위 사이트에 이것이 없으면 방문자는
        인피닉의 일부인지 별개 서비스인지 알 수 없다.
      */}
      <a
        href={BRAND.site.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 px-3 py-2 text-ink-400 transition-colors hover:text-white"
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
