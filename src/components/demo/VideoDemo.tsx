'use client';

import { useState } from 'react';
import { DemoFallback, type FallbackContent } from './DemoFallback';
import { VideoSources } from '@/components/ui/Video';

/**
 * video 타입 데모.
 * 영상 파일이 없거나 재생할 수 없으면 폴백으로 넘긴다 — 깨진 플레이어를 남기지 않는다.
 */
export function VideoDemo({
  src,
  srcWebm,
  poster,
  fallback,
}: {
  src: string;
  srcWebm?: string;
  poster?: string;
  fallback: FallbackContent;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <DemoFallback
        message="데모 영상을 재생할 수 없습니다."
        // 재생에 실패한 영상을 폴백에서 다시 시도하지 않도록 영상은 제외한다.
        content={{ metric: fallback.metric, thumbnail: fallback.thumbnail }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-ink-900">
      <video
        className="aspect-video w-full"
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onError={(event) => {
          // <source> 가 여러 개일 때 앞 소스가 실패하면 브라우저는 다음 소스로 넘어간다.
          // 그 중간 실패까지 폴백으로 처리하면 재생 가능한 영상이 있는데도 폴백이 뜬다.
          // 모든 소스가 소진된 경우(NETWORK_NO_SOURCE)만 진짜 실패로 본다.
          const video = event.currentTarget;
          if (video.error || video.networkState === video.NETWORK_NO_SOURCE) {
            setFailed(true);
          }
        }}
      >
        <VideoSources mp4={src} webm={srcWebm} />
      </video>
    </div>
  );
}
