import { BRAND } from '@/lib/brand';

/**
 * 헤더 오른쪽.
 *
 * 메뉴는 없다. 이 사이트의 목적지는 하나(기술 목록 = 메인)다 — 워드마크가
 * 메인으로 돌아가는 길이고, 남는 것은 본사로 가는 문뿐이다. 도입 문의
 * 버튼은 뺐다: 메인 하단과 상세 화면에 문의 구간이 이미 있어, 헤더까지
 * 세우면 같은 문이 세 개가 된다. 갈 곳이 늘어나는 날 메뉴를 되살린다.
 */
export function MainNav() {
  return (
    <nav className="flex items-center text-sm">
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
    </nav>
  );
}
