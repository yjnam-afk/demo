import Link from 'next/link';
import type { DomainDef } from '@/lib/domain/types';
import { accentStyle, cn } from '@/lib/ui/domain';

/**
 * 기술 3축 소개 블록.
 *
 * 3축은 회사 서사의 뼈대다. 필터 칩으로만 존재하면 방문자는 우리가 무엇을 하는
 * 조직인지 읽지 못하고 기술 목록만 훑게 된다. 그래서 카탈로그와 랜딩 모두에서
 * 카드 그리드보다 먼저 이 블록을 놓는다.
 *
 * 각 축은 해당 축으로 필터가 걸린 카탈로그로 연결된다.
 */
export function DomainPillars({
  domains,
  counts,
  selected,
}: {
  /** 축 마스터. 개수도 순서도 데이터가 정한다 — 3개로 가정하지 않는다. */
  domains: DomainDef[];
  counts: Record<string, number>;
  /** 카탈로그에서 이미 선택된 축. 선택 상태를 시각적으로 되짚어 준다. */
  selected?: string | null;
}) {
  if (domains.length === 0) return null;

  return (
    // 축 개수를 코드에 박지 않는다. 관리자가 4개를 만들면 4열이 되어야 한다.
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        domains.length === 2 && 'md:grid-cols-2',
        domains.length === 3 && 'md:grid-cols-3',
        domains.length >= 4 && 'sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {domains.map((def) => {
        const domain = def.id;
        const style = accentStyle(def.accent);
        const count = counts[domain] ?? 0;
        const isSelected = selected === domain;

        return (
          <Link
            key={domain}
            href={isSelected ? '/tech' : `/tech?domain=${domain}`}
            scroll={false}
            className={cn(
              'group flex flex-col rounded-lg border bg-white p-5 transition-colors',
              isSelected ? style.border : 'border-ink-200 hover:border-ink-400',
            )}
          >
            {/* 축 색은 상단 얇은 바로만 쓴다. 면적을 크게 잡으면 채도가 튄다. */}
            <span className={cn('-mt-5 -mx-5 mb-4 h-1 rounded-t-lg', style.bar)} />

            <div className="flex items-baseline justify-between">
              <h3 className={cn('text-lg font-semibold', style.text)}>{def.label}</h3>
              <span className="numeric text-sm text-ink-400">{count}건</span>
            </div>

            <p className="mt-2 text-sm font-medium text-ink-900">{def.lead}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
              {def.description}
            </p>

            <span className="mt-4 text-sm text-ink-600 group-hover:text-ink-900">
              {/* 축 이름에 이미 "기술"이 들어가 "AI 요소기술 기술 보기"가 된다 */}
              {isSelected ? '← 전체 기술로 돌아가기' : `${count}건 보기 →`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
