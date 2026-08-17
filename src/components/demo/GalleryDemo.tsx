'use client';

import { useState } from 'react';
import type { GalleryItem } from '@/lib/domain/types';
import { cn } from '@/lib/ui/domain';

/**
 * 결과 갤러리 — 미리 만든 "입력 → 식별 결과" 쌍을 넘겨 본다.
 *
 * 식별 모델의 데모다. 라이브 호출이 아니다 — 지금 인프라(Vercel)에서는
 * 내부망 모델에 닿을 수 없고, 전시장에서는 미리 만든 결과가 라이브보다
 * 안전하다. 샘플을 고르는 인터랙션만으로 "돌려 보는 느낌" 을 만들고,
 * 온프레미스 전환 후 같은 화면 뒤에 실호출을 붙인다.
 */
export function GalleryDemo({ items }: { items: GalleryItem[] }) {
  const usable = items.filter((item) => item.input && item.output);
  const [index, setIndex] = useState(0);
  const current = usable[Math.min(index, usable.length - 1)];

  if (!current) return null;

  return (
    <div>
      {/* 샘플 선택 — 하나뿐이면 고를 것이 없으니 칩 줄을 내지 않는다 */}
      {usable.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {usable.map((item, i) => (
            <button
              key={`${item.input}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'rounded border px-3 py-1.5 text-sm transition-colors',
                i === Math.min(index, usable.length - 1)
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500',
              )}
            >
              {item.label || `샘플 ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      {/* 입력과 결과는 나열이 아니라 흐름이다 — 도입 정보의 입력→출력과 같은 문법 */}
      <div
        className={cn(
          'grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch',
          usable.length > 1 && 'mt-4',
        )}
      >
        <figure className="overflow-hidden glass-card rounded-lg border border-ink-200/70">
          <div className="border-b border-ink-100 px-4 py-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
            입력
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.input}
            alt={`${current.label || '샘플'} 입력`}
            className="h-72 w-full bg-ink-50 object-contain sm:h-80"
          />
        </figure>

        <div className="hidden items-center text-xl text-ink-300 sm:flex" aria-hidden>
          →
        </div>

        <figure className="overflow-hidden glass-card rounded-lg border border-ink-200/70">
          <div className="border-b border-ink-100 px-4 py-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
            식별 결과
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.output}
            alt={`${current.label || '샘플'} 식별 결과`}
            className="h-72 w-full bg-ink-50 object-contain sm:h-80"
          />
        </figure>
      </div>

      {current.note?.trim() ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{current.note}</p>
      ) : null}
    </div>
  );
}
