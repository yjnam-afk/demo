'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 동시 재생 수 제한.
 *
 * 화면 밖 영상을 멈추는 것만으로는 부족했다. 카드 네 개가 한 화면에 들어오면
 * 네 개가 전부 재생 대상이 되고, 히어로까지 합쳐 다섯 개의 디코더가 동시에
 * 돌아 스크롤 프레임이 밀린다 (측정: 랜딩에서 프레임 13% 유실).
 *
 * 그래서 뷰포트 안에 있어도 동시에 재생하는 개수를 묶는다. 자리를 못 잡은
 * 영상은 포스터로 남는다 — 어차피 한 번에 여러 영상을 동시에 보는 사람은
 * 없고, 자리가 나면 곧바로 이어받는다.
 */
const MAX_PLAYING = 2;
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
      // 미리 받아 두지 않는다. 여백을 크게 잡으면 화면 밖 영상까지 재생
      // 대상이 되어 동시 재생 수가 불필요하게 늘어난다.
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
