'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 동시 재생 수 제한.
 *
 * 화면 밖 영상은 어차피 멈추므로, 이 값은 "한 화면에 함께 보이는 영상"의
 * 상한이어야 한다. 처음에 2로 묶었더니 랜딩의 카드 네 장 중 두 장만 움직이고
 * 나머지는 정지 화면으로 남아 고장으로 읽혔다 — 제한이 보이는 카드 수보다
 * 작으면 사용자에게는 안 나오는 영상이 된다.
 *
 * 카드 루프는 수십 KB짜리 저해상도 클립이라 여섯 개를 동시에 돌려도 디코더
 * 부담이 작다. 6은 데스크톱 한 화면에 들어오는 카드 수를 덮는 값이고,
 * 그 밖의 극단적인 배치에서만 대기열이 안전판으로 남는다.
 */
const MAX_PLAYING = 6;
const playing = new Set<HTMLVideoElement>();
/** 자리를 기다리는 영상. 뷰포트를 벗어나면 목록에서 빠진다. */
const waiting = new Set<() => void>();

function release(video: HTMLVideoElement) {
  if (!playing.delete(video)) return;
  // 먼저 기다린 것부터 자리를 넘긴다.
  const next = waiting.values().next();
  if (!next.done) {
    waiting.delete(next.value);
    next.value();
  }
}

function acquire(video: HTMLVideoElement, start: () => void): (() => void) | null {
  if (playing.size < MAX_PLAYING) {
    playing.add(video);
    start();
    return null;
  }
  const claim = () => {
    playing.add(video);
    start();
  };
  waiting.add(claim);
  return claim;
}

/**
 * 카드 썸네일 루프.
 *
 *  - preload="none": 화면에 들어오기 전에는 내려받지 않는다
 *  - 뷰포트에 들어올 때만, 그리고 자리가 있을 때만 재생한다
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
  priority = false,
}: {
  mp4: string;
  webm?: string;
  poster?: string;
  className?: string;
  /** 히어로 배경처럼 항상 움직여야 하는 자리. 동시 재생 제한을 받지 않는다. */
  priority?: boolean;
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

  /*
    내려받기는 화면에 들어오기 전에 미리 시작한다.

    재생 시점에야 받기 시작하면(preload="none" 그대로) 카드가 보이고 나서
    첫 프레임까지 빈 화면이 뜬다. 드라이브에 올린 영상은 서버 리다이렉트를
    거쳐 구글에서 받아오므로 이 공백이 특히 길다. 화면 600px 앞에서 받기
    시작하면 스크롤이 닿을 때쯤에는 이미 버퍼가 차 있다.

    재생과는 별개다 — 받아 두는 것은 여유 있게, 트는 것은 화면 안에서만.
  */
  useEffect(() => {
    const video = ref.current;
    if (!video || !allowed) return;

    const preloader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.preload = 'auto';
          preloader.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    preloader.observe(video);
    return () => preloader.disconnect();
  }, [allowed]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !allowed) return;

    let claim: (() => void) | null = null;
    // play() 는 자동재생이 막히면 거부한다. 그때는 포스터가 그대로 남는다.
    const start = () => void video.play().catch(() => undefined);

    const stop = () => {
      video.pause();
      if (claim) {
        waiting.delete(claim);
        claim = null;
      }
      release(video);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (priority) start();
          else claim = acquire(video, start);
        } else {
          stop();
        }
      },
      // 재생 판정에는 여백을 두지 않는다. 여백을 크게 잡으면 화면 밖
      // 영상까지 재생 대상이 되어 동시 재생 자리를 헛되이 차지한다.
      // (내려받기는 위의 preloader 가 미리 해 둔다.)
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [allowed, priority]);

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
