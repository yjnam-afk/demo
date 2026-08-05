import Link from 'next/link';
import { cn } from '@/lib/ui/domain';

export const CATALOG_VIEWS = ['product', 'tech', 'industry'] as const;
export type CatalogView = (typeof CATALOG_VIEWS)[number];

export const VIEW_LABELS: Record<CatalogView, string> = {
  product: '제품별',
  tech: '기술별',
  industry: '산업별',
};

const VIEW_HINTS: Record<CatalogView, string> = {
  product: '무엇을 도입할 수 있는지부터 봅니다.',
  tech: '보유 기술을 성능 지표와 함께 훑어봅니다.',
  industry: '우리 산업에 무엇이 적용되는지 봅니다.',
};

export function isCatalogView(value: unknown): value is CatalogView {
  return typeof value === 'string' && (CATALOG_VIEWS as readonly string[]).includes(value);
}

/**
 * 보기 기준 전환.
 *
 * 제품·기술·산업은 서로 다른 목록이 아니라 같은 자료를 보는 세 가지 기준이다.
 * 화면을 따로 두면 방문자가 "제품 페이지에는 없고 기술 페이지에는 있는 것"을
 * 의심하게 되므로, 한 화면에서 기준만 바꾼다.
 *
 * 기준은 URL 에 남는다 — 영업 담당이 특정 기준으로 본 화면을 그대로 전달할 수 있다.
 */
export function ViewSwitcher({
  current,
  params,
}: {
  current: CatalogView;
  /** 현재 필터 상태. 기준을 바꿔도 필터는 유지된다. */
  params: URLSearchParams;
}) {
  function hrefFor(view: CatalogView): string {
    const next = new URLSearchParams(params);
    next.set('view', view);
    next.delete('offset');
    return `/tech?${next.toString()}`;
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-ink-300 bg-white p-1">
        {CATALOG_VIEWS.map((view) => (
          <Link
            key={view}
            href={hrefFor(view)}
            scroll={false}
            aria-current={view === current ? 'page' : undefined}
            className={cn(
              'rounded px-4 py-2 text-sm font-medium transition-colors',
              view === current
                ? 'bg-ink-800 text-white'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )}
          >
            {VIEW_LABELS[view]}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-500">{VIEW_HINTS[current]}</p>
    </div>
  );
}
