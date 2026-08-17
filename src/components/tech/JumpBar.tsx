'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/ui/domain';

/**
 * 구간 바로가기 + 현재 위치 표시.
 *
 * 막대가 화면을 따라오는데 지금 어느 구간을 읽고 있는지 말해 주지 않으면
 * 절반만 일하는 것이다. 긴 상세 페이지에서 방문자가 길을 잃지 않도록,
 * 스크롤 위치에 해당하는 구간의 칩을 채워서 표시한다.
 *
 * IntersectionObserver 대신 스크롤 좌표로 판정한다 — 구간 길이가 제각각이라
 * (짧은 인증 구간, 긴 자료 구간) 교차 비율 기반 판정은 긴 구간 한가운데서
 * 이웃 구간을 가리키는 오판이 잦다. "붙박이 막대 아래 선을 마지막으로 지난
 * 구간" 하나면 판정이 흔들리지 않는다.
 */
export function JumpBar({ jumps }: { jumps: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      // 붙박이 막대 바로 아래를 기준선으로 삼는다 (헤더 + 막대 높이 근처).
      const line = 176;
      let current: string | null = null;
      for (const jump of jumps) {
        const el = document.getElementById(jump.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = jump.id;
      }
      // 바닥까지 내리면 마지막 구간이 짧아도 그 구간을 가리킨다.
      const scrolledToEnd =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (scrolledToEnd && jumps.length > 0) current = jumps[jumps.length - 1].id;
      setActive(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [jumps]);

  return (
    <nav
      aria-label="구간 바로가기"
      className="glass-light sticky top-20 z-10 border-b border-ink-200/70 sm:top-24"
    >
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
        {jumps.map((jump) => (
          <a
            key={jump.id}
            href={`#${jump.id}`}
            aria-current={active === jump.id ? 'true' : undefined}
            className={cn(
              'flex shrink-0 items-center rounded border px-3 py-1.5 text-sm transition-colors',
              active === jump.id
                ? 'border-ink-900 bg-ink-900 font-medium text-white'
                : 'border-ink-300 bg-white text-ink-700 hover:border-ink-500 hover:text-ink-900',
            )}
          >
            {jump.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
