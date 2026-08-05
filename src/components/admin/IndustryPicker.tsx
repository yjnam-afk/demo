'use client';

import { useState } from 'react';
import type { Industry } from '@/lib/domain/types';

/**
 * 산업군 선택.
 *
 * 자유 입력을 허용하지 않는다 — "자율주행"과 "자율 주행"이 따로 쌓이면
 * 산업별 화면이 무너진다. 목록에 없는 산업이 필요하면 아래 버튼으로 마스터에
 * 먼저 추가한 뒤 고르게 한다(카테고리와 같은 방식).
 */
export function IndustryPicker({
  industries,
  selected,
  onChange,
  onAdded,
}: {
  industries: Industry[];
  selected: string[];
  onChange: (next: string[]) => void;
  onAdded: (next: Industry[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const label = prompt('추가할 산업군 이름')?.trim();
    if (!label) return;

    const response = await fetch('/api/admin/industries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      industries?: Industry[];
      error?: string;
    };

    if (!response.ok || !body.industries) {
      setError(body.error ?? '산업군을 추가하지 못했습니다.');
      return;
    }
    setError(null);
    onAdded(body.industries);

    const created = body.industries.find((item) => item.label === label);
    if (created && !selected.includes(created.id)) onChange([...selected, created.id]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {industries.map((industry) => {
          const active = selected.includes(industry.id);
          return (
            <button
              key={industry.id}
              type="button"
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((id) => id !== industry.id)
                    : [...selected, industry.id],
                )
              }
              className={
                active
                  ? 'rounded border border-ink-700 bg-ink-700 px-3 py-1.5 text-sm text-white'
                  : 'rounded border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500'
              }
            >
              {industry.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="text-xs text-[var(--color-signal-fail)]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void add()}
        className="w-fit text-xs text-ink-500 underline underline-offset-2 hover:text-ink-900"
      >
        + 새 산업군 만들기
      </button>
    </div>
  );
}
