'use client';

import { useState } from 'react';
import { DemoFallback, type FallbackContent } from './DemoFallback';

/**
 * video 타입 데모.
 * 영상 파일이 없거나 재생할 수 없으면 폴백으로 넘긴다 — 깨진 플레이어를 남기지 않는다.
 */
export function VideoDemo({
  src,
  poster,
  fallback,
}: {
  src: string;
  poster?: string;
  fallback: FallbackContent;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <DemoFallback
        message="데모 영상을 재생할 수 없습니다."
        // 재생 실패한 영상을 폴백에서 다시 시도하지 않도록 영상은 제외한다.
        content={{ metric: fallback.metric }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-ink-900">
      <video
        className="aspect-video w-full"
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
