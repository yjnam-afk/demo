'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/ui/domain';

export interface ChipItem {
  key: string;
  label: string;
  /** 라벨 뒤에 흐리게 붙는 보조 문구 (대분류 표시 등) */
  note?: string;
  count: number;
  href: string;
  active: boolean;
}

const COLLAPSED_COUNT = 8;

/**
 * 선택지가 많아져도 화면이 무너지지 않게 접어 두는 필터 묶음.
 *
 * 기술이 늘면 적용 산업·카테고리 선택지도 함께 늘어난다. 전부 펼쳐 두면
 * 모바일에서 카드가 첫 화면 밖으로 밀려나므로, 기본은 접고 필요할 때 펼친다.
 * 선택된 항목은 접힌 상태에서도 항상 보이게 앞으로 끌어온다.
 */
export function ExpandableChips({ items }: { items: ChipItem[] }) {
  const [expanded, setExpanded] = useState(false);

  const ordered = [...items].sort((a, b) => Number(b.active) - Number(a.active));
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);
  const hidden = ordered.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          className={cn(
            'rounded border px-3 py-1.5 text-sm transition-colors',
            item.active
              ? 'border-ink-700 bg-ink-700 text-white'
              : 'border-ink-300 bg-white text-ink-600 hover:border-ink-500',
          )}
        >
          {item.label}
          {item.note ? <span className="ml-1 text-xs text-ink-400">{item.note}</span> : null}
          <span className="numeric ml-1 text-xs text-ink-400">{item.count}</span>
        </Link>
      ))}

      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded px-2 py-1.5 text-sm text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          {expanded ? '접기' : `+${hidden}개 더`}
        </button>
      ) : null}
    </div>
  );
}
