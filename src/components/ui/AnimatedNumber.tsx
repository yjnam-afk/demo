'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 수치 카운트업.
 *
 * 방문자가 그 숫자를 실제로 보는 순간 0 에서 실제 값까지 차오른다. 숫자가
 * 이 사이트의 주인공이므로 움직임도 숫자에게만 준다.
 *
 * "보는 순간"의 판정이 이 컴포넌트의 전부다:
 *  - 화면 하단에 걸치자마자가 아니라 한 뼘(12%) 들어와야 시작한다.
 *  - 구간 떠오름(data-reveal)이 아직 투명한 동안에는 시작하지 않는다 —
 *    보이지 않는 채로 다 차올라 버리면 방문자에게는 효과가 없던 것이 된다.
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
    let mutation: MutationObserver | null = null;
    let done = false;

    const run = () => {
      if (done) return;
      done = true;
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
      // 출발선을 먼저 보여 준다 — 완성값에서 갑자기 0 으로 튀는 프레임을 없앤다
      setText((0).toFixed(decimals));
      raf = requestAnimationFrame(tick);
    };

    /* 구간 떠오름이 끝나기를 기다렸다가 시작한다. 떠오름이 없는 자리면 즉시. */
    const startWhenVisible = () => {
      const host = el.closest<HTMLElement>('[data-reveal]');
      if (host && host.dataset.reveal === 'out') {
        mutation = new MutationObserver(() => {
          if (host.dataset.reveal !== 'out') {
            mutation?.disconnect();
            mutation = null;
            run();
          }
        });
        mutation.observe(host, { attributes: true, attributeFilter: ['data-reveal'] });
      } else {
        run();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        startWhenVisible();
      },
      // 숫자의 60% 이상이, 화면 하단에서 12% 들어온 지점을 지나야 "노출"이다
      { threshold: 0.6, rootMargin: '0px 0px -12% 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      mutation?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, formatted]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
