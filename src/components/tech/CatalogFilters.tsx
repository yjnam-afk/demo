import Link from 'next/link';
import { ExpandableChips, type ChipItem } from './ExpandableChips';
import { type Accent } from '@/lib/domain/enums';
import { isActive, strippedHref, toggledHref } from '@/lib/ui/query';
import { accentStyle, cn } from '@/lib/ui/domain';

export interface Facets {
  /** 라벨과 색은 저장소가 마스터에서 붙여 준다 — 화면은 다시 조회하지 않는다. */
  domains: { value: string; label: string; short_label: string; accent: Accent; count: number }[];
  categories: { value: string; domain: string; count: number }[];
  industries: { value: string; label: string; count: number }[];
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-20 shrink-0 pt-2 text-xs font-medium tracking-wide text-ink-500 uppercase">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * 필터는 링크로 만든다. 상태를 URL 에 두면 영업 담당이 필터가 걸린 화면을
 * 그대로 고객에게 전달할 수 있고, 클라이언트 자바스크립트도 필요 없다.
 *
 * 선택지는 실제 데이터에서 뽑으므로(facets) 기술이 늘어도 목록을 손대지 않는다.
 */
export function CatalogFilters({ facets, params }: { facets: Facets; params: URLSearchParams }) {
  const selectedDomain = params.get('domain');

  const domainShort = new Map(facets.domains.map((d) => [d.value, d.short_label]));

  /*
    카테고리는 대분류를 따른다. 축을 고르면 그 축의 카테고리만 서고,
    전체에서는 모든 카테고리가 축 표식을 달고 선다 — 여기서 바로 골라
    들어가는 길을 막을 이유는 없다.

    검증 등급 필터는 두지 않는다. 방문자는 풀려는 문제(축·카테고리·산업)로
    찾지 "개발 중인 것만 보기" 로 찾지 않고, 검증 등급은 카드마다 배지로
    이미 보인다 — 필터로 세우면 가장 약한 항목만 모아 보는 길을 안내하는
    셈이 된다.
  */
  const visibleCategories = selectedDomain
    ? facets.categories.filter((c) => c.domain === selectedDomain)
    : facets.categories;

  const categoryChips: ChipItem[] = visibleCategories.map(({ value, domain, count }) => ({
    key: value,
    label: value,
    note: selectedDomain ? undefined : domainShort.get(domain),
    count,
    href: toggledHref(params, 'category', value),
    active: isActive(params, 'category', value),
  }));

  // 값은 산업군 id, 표시는 라벨. 둘을 섞으면 칩에 raw id 가 그대로 보인다.
  const industryChips: ChipItem[] = facets.industries.map(({ value, label, count }) => ({
    key: value,
    label,
    count,
    href: toggledHref(params, 'industry', value),
    active: isActive(params, 'industry', value),
  }));

  const hasAnyFilter = [...params.keys()].some((key) => key !== 'offset');

  return (
    <div className="glass-card flex flex-col gap-4 rounded-lg border border-ink-200/70 p-4">
      {/* 대분류 — 단일 선택 */}
      <div className="flex flex-wrap gap-2">
        <Link
          // 전체는 축·카테고리만 해제한다. 산업군 등 다른 필터까지 지우면
          // "전체" 가 아니라 "초기화" 가 된다.
          href={strippedHref(params, ['domain', 'category'])}
          scroll={false}
          className={cn(
            'rounded border px-4 py-2 text-sm font-medium',
            selectedDomain === null
              ? 'border-ink-800 bg-ink-800 text-ink-50'
              : 'border-ink-300 bg-white/5 text-ink-600 hover:border-ink-500',
          )}
        >
          전체
        </Link>
        {facets.domains.map(({ value, label, accent, count }) => {
          const active = selectedDomain === value;
          const style = accentStyle(accent);
          return (
            <Link
              key={value}
              href={toggledHref(params, 'domain', value, { single: true, clear: ['category'] })}
              scroll={false}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium',
                active
                  ? cn(style.border, style.bg, style.text)
                  : 'border-ink-300 bg-white/5 text-ink-600 hover:border-ink-500',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', style.dot)} />
              {label}
              <span className="numeric text-xs text-ink-500">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-ink-100 pt-4">
        {categoryChips.length > 0 ? (
          <Group label="카테고리">
            <ExpandableChips items={categoryChips} />
          </Group>
        ) : null}

        {industryChips.length > 0 ? (
          <Group label="산업군">
            <ExpandableChips items={industryChips} />
          </Group>
        ) : null}
      </div>

      {hasAnyFilter ? (
        <div className="border-t border-ink-100 pt-3">
          <Link href="/tech" scroll={false} className="text-sm text-ink-500 hover:text-ink-900">
            필터 초기화
          </Link>
        </div>
      ) : null}
    </div>
  );
}
