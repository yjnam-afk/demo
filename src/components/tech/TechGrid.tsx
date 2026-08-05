'use client';

import { useState } from 'react';
import { TechCard } from './TechCard';
import type { PublicTech } from '@/lib/domain/types';

/**
 * 카드 그리드.
 *
 * 열 수는 화면 폭으로만 정하고 항목 수는 보지 않는다. 4건이든 80건이든
 * 같은 규칙으로 배치되므로 기술이 늘어도 레이아웃을 손댈 일이 없다.
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
        <p className="mt-1 text-sm text-ink-400">필터를 줄여서 다시 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((tech) => (
          <TechCard key={tech.id} tech={tech} />
        ))}
      </div>

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
