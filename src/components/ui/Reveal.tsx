'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 구간 떠오름 관리자.
 *
 * data-reveal 속성이 달린 요소를 지켜보다가, 화면에 들어오는 순간 값을
 * in 으로 바꾼다 — 실제 움직임은 globals.css 의 [data-reveal] 규칙이 진다.
 *
 * 순서가 안전판이다: 요소는 보이는 상태로 그려지고, 이 관리자가 붙은 뒤에야
 * 화면 밖 요소만 out(투명)으로 내린다. JS 가 없거나 늦으면 아무 일도 일어나지
 * 않고 전부 그대로 보인다. 이미 화면 안에 있는 요소는 숨겼다 되살리지 않는다
 * — 첫 화면이 로드 직후 들썩이면 기교가 아니라 결함이다.
 *
 * 페이지 이동(App Router 클라이언트 내비게이션)마다 다시 훑어야 하므로
 * pathname 을 의존성으로 둔다. 레이아웃에 한 번만 심는다.
 */
export function RevealManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          observer.unobserve(entry.target);
        }
      },
      // 하단 가장자리에 걸치자마자가 아니라 한 뼘 들어왔을 때 떠오른다
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        el.dataset.reveal = 'in';
      } else {
        el.dataset.reveal = 'out';
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
