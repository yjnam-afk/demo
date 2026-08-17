'use client';

import { useState } from 'react';
import { DemoFallback, type FallbackContent } from './DemoFallback';
import { VideoSources } from '@/components/ui/Video';
import { driveIdFromPath, driveViewUrl, extractDriveFileId } from '@/lib/gdrive';

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

  /*
    드라이브 영상은 드라이브 자체 플레이어로 튼다.

    alt=media 직행 스트리밍은 파일별 전송 할당에 걸려, 잘 나오던 영상이
    어느 날 갑자기 끊긴다(재생을 반복할수록 빨리 소진된다). 자체 플레이어는
    그 할당의 영향 없이 구글 인프라로 스트리밍하고, API 키도 쓰지 않는다.
  */
  /*
    내부 경로(/api/media/gdrive/<id>)든 붙여넣은 드라이브 원본 주소든 모두
    받아 준다. 정규화를 거치지 않고 저장된 기록이 있으면 앞의 판별만으로는
    드라이브 영상인 줄 몰라 옛 스트리밍 경로로 떨어졌다.
    데모 영상 칸이 비어 있으면 미디어 구간의 전체 영상을 대신 쓴다.
  */
  const source = src?.trim() || fallback.video || '';
  const driveId = driveIdFromPath(source) ?? extractDriveFileId(source);
  if (driveId) {
    return (
      <div className="overflow-hidden rounded-lg border border-ink-200 bg-ink-950">
        <iframe
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          title="데모 영상"
          className="aspect-video w-full"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
        {/*
          임베드 안에서 재생이 막히는 경우가 있다 — 브라우저가 서드파티
          쿠키를 차단하면 드라이브 플레이어가 다른 사이트 안에서 "동영상을
          로드할 수 없습니다" 로 끝난다. 방문자를 막다른 길에 두지 않도록
          원본을 새 탭에서 여는 길을 항상 함께 둔다.
        */}
        <div className="flex justify-end border-t border-white/10 px-4 py-2">
          <a
            href={driveViewUrl(driveId)}
            target="_blank"
            rel="noopener"
            className="text-sm text-ink-500 hover:text-white"
          >
            재생되지 않으면 새 창에서 열기 ↗
          </a>
        </div>
      </div>
    );
  }

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
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-ink-950">
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
        <VideoSources mp4={source} webm={srcWebm} />
      </video>
    </div>
  );
}
