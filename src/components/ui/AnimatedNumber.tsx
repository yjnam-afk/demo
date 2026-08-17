'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 수치 카운트업.
 *
 * 화면에 들어오는 순간 0 에서 실제 값까지 차오른다. 숫자가 이 사이트의
 * 주인공이므로 움직임도 숫자에게만 준다.
 *
 * 서버가 그린 최종 값으로 시작한다 — JS 가 없는 환경(크롤러·인쇄)에서는
 * 그냥 완성된 숫자다. 자릿수는 최종 표기(formatted)의 소수 자리에 고정해
 * 차오르는 동안 폭이 흔들리지 않게 한다(.numeric 의 tabular-nums 와 한 쌍).
 */
export function AnimatedNumber({
  value,
  formatted,
  className,
}: {
  value: number;
  /** formatNumber(value) 결과. 애니메이션의 종착점이자 JS 이전의 표시값. */
  formatted: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(formatted);

  useEffect(() => {
    const el = ref.current;
    if (!el || !Number.isFinite(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const decimals = formatted.includes('.') ? formatted.split('.')[1].length : 0;
    let raf = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / duration);
          // 끝을 길게 감속한다 — 마지막 한 자리가 자리 잡는 순간이 읽혀야 한다
          const eased = 1 - Math.pow(1 - k, 3);
          if (k >= 1) {
            setText(formatted);
            return;
          }
          setText((value * eased).toFixed(decimals));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, formatted]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
