'use client';

import { useState } from 'react';
import { TechRowList } from './TechRow';
import type { PublicTech } from '@/lib/domain/types';

/**
 * 기술 목록.
 *
 * 행 목록이다. 카드 격자는 높이를 맞추려고 문제 문장을 잘랐는데, 그 문장이
 * 이 사이트에서 가장 공들인 글이라 자르지 않는 쪽을 택했다. 항목 수와
 * 무관하게 같은 규칙으로 쌓인다.
 */
export function TechGrid({
  initialItems,
  total,
  hasMore: initialHasMore,
  query,
}: {
  initialItems: PublicTech[];
  total: number;
  hasMore: boolean;
  /** 현재 필터 상태. "더보기"가 같은 조건으로 이어서 조회한다. */
  query: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(query);
      params.set('offset', String(items.length));
      const response = await fetch(`/api/tech?${params.toString()}`);
      if (!response.ok) throw new Error('failed');

      const page = (await response.json()) as {
        items: PublicTech[];
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } catch {
      setError('목록을 더 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
        <p className="text-sm text-ink-600">조건에 맞는 기술이 없습니다.</p>
        <p className="mt-1 text-sm text-ink-400">필터를 줄여 다시 확인해 보십시오.</p>
      </div>
    );
  }

  return (
    <div>
      <TechRowList techs={items} />

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="numeric text-xs text-ink-400">
          {items.length} / {total}
        </p>
        {error ? <p className="text-sm text-[var(--color-signal-fail)]">{error}</p> : null}
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded border border-ink-300 bg-white px-6 py-2 text-sm text-ink-700 hover:border-ink-500 disabled:opacity-60"
          >
            {loading ? '불러오는 중…' : '더보기'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
