import Link from 'next/link';
import { ExpandableChips, type ChipItem } from './ExpandableChips';
import {
  DOMAIN_LABELS,
  DOMAIN_SHORT_LABELS,
  VERIFICATION_LABELS,
  type Domain,
  type VerificationLevel,
} from '@/lib/domain/enums';
import { isActive, toggledHref } from '@/lib/ui/query';
import { DOMAIN_STYLES, cn } from '@/lib/ui/domain';

export interface Facets {
  domains: { value: Domain; count: number }[];
  categories: { value: string; domain: Domain; count: number }[];
  verification: { value: VerificationLevel; count: number }[];
  industries: { value: string; label: string; count: number }[];
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-20 shrink-0 pt-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
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
  const selectedDomain = params.get('domain') as Domain | null;

  // 대분류가 선택되면 그 축의 하위 카테고리만 보여준다.
  const visibleCategories = selectedDomain
    ? facets.categories.filter((c) => c.domain === selectedDomain)
    : facets.categories;

  const categoryChips: ChipItem[] = visibleCategories.map(({ value, domain, count }) => ({
    key: value,
    label: value,
    note: selectedDomain ? undefined : DOMAIN_SHORT_LABELS[domain],
    count,
    href: toggledHref(params, 'category', value),
    active: isActive(params, 'category', value),
  }));

  const verificationChips: ChipItem[] = facets.verification.map(({ value, count }) => ({
    key: value,
    label: VERIFICATION_LABELS[value],
    count,
    href: toggledHref(params, 'verification', value),
    active: isActive(params, 'verification', value),
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
    <div className="flex flex-col gap-4 rounded-lg border border-ink-200 bg-white p-4">
      {/* 대분류 3축 — 단일 선택 */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/tech"
          scroll={false}
          className={cn(
            'rounded border px-4 py-2 text-sm font-medium',
            selectedDomain === null
              ? 'border-ink-700 bg-ink-700 text-white'
              : 'border-ink-300 bg-white text-ink-600 hover:border-ink-500',
          )}
        >
          전체
        </Link>
        {facets.domains.map(({ value, count }) => {
          const active = selectedDomain === value;
          const style = DOMAIN_STYLES[value];
          return (
            <Link
              key={value}
              href={toggledHref(params, 'domain', value, { single: true })}
              scroll={false}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium',
                active
                  ? cn(style.border, style.bg, style.text)
                  : 'border-ink-300 bg-white text-ink-600 hover:border-ink-500',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', style.dot)} />
              {DOMAIN_LABELS[value]}
              <span className="numeric text-xs text-ink-400">{count}</span>
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

        {verificationChips.length > 0 ? (
          <Group label="검증 등급">
            <ExpandableChips items={verificationChips} />
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
