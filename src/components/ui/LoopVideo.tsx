'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 카드 썸네일 루프.
 *
 * 자동재생을 그대로 두면 화면 밖 카드의 영상까지 전부 내려받아 계속 디코딩한다.
 * 카드가 몇 개만 되어도 디코더가 동시에 여러 개 돌아 스크롤이 버벅이고,
 * 목록 한 번 여는 데 수백 KB 가 영상으로만 나간다.
 *
 * 그래서 세 가지를 지킨다.
 *  - preload="none": 화면에 들어오기 전에는 내려받지 않는다
 *  - 뷰포트에 들어올 때만 재생하고 나가면 멈춘다
 *  - 재생 전에는 같은 구도의 포스터를 보여준다 (상세용 포스터를 쓰면 구도가
 *    달라 재생 시작 순간 화면이 튄다)
 *
 * 모션을 줄이도록 설정한 사용자에게는 아예 재생하지 않고 포스터만 남긴다.
 */
export function LoopVideo({
  mp4,
  webm,
  poster,
  className,
}: {
  mp4: string;
  webm?: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAllowed(!reduced.matches);

    const onChange = () => setAllowed(!reduced.matches);
    reduced.addEventListener('change', onChange);
    return () => reduced.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !allowed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() 는 자동재생이 막히면 거부한다. 그때는 포스터가 그대로 남는다.
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      // 살짝 미리 시작해 카드가 완전히 보일 때는 이미 움직이고 있게 한다.
      { rootMargin: '200px', threshold: 0.1 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [allowed]);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
    >
      <source src={mp4} type="video/mp4" />
      {webm ? <source src={webm} type="video/webm" /> : null}
    </video>
  );
}
