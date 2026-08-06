import { MetricStat } from '@/components/tech/MetricDisplay';
import { VideoSources } from '@/components/ui/Video';
import type { PublicMetric } from '@/lib/domain/types';

export interface FallbackContent {
  video?: string;
  video_webm?: string;
  poster?: string;
  metric?: PublicMetric | null;
  /** 영상도 지표도 없는 기술의 마지막 시각 자료 */
  thumbnail?: string;
}

/**
 * 데모 실패 시의 대체 화면.
 *
 * 엔드포인트가 죽었을 때 흰 화면을 보여주면 방문자는 회사 전체를 의심한다.
 * 상황을 설명하고, 그 기술의 영상 또는 대표 수치로 즉시 대체한다.
 */
export function DemoFallback({
  message,
  content,
  onRetry,
}: {
  message: string;
  content: FallbackContent;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-[var(--color-signal-warn-soft)] px-4 py-3">
        <p className="text-sm text-[var(--color-signal-warn)]">
          {message} 아래 자료로 대신 확인하실 수 있습니다.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded border border-[var(--color-signal-warn)]/40 px-3 py-1 text-sm text-[var(--color-signal-warn)] hover:bg-white"
          >
            다시 시도
          </button>
        ) : null}
      </div>

      <div className="p-4">
        {content.video ? (
          <video
            className="w-full rounded bg-ink-900"
            poster={content.poster}
            controls
            playsInline
            preload="metadata"
          >
            <VideoSources mp4={content.video} webm={content.video_webm} />
          </video>
        ) : content.metric ? (
          <MetricStat metric={content.metric} size="lg" />
        ) : content.thumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-full rounded border border-ink-200"
              src={content.thumbnail}
              alt="데모 화면 예시"
            />
            <p className="mt-3 text-sm text-ink-500">
              실제 돌아가는 화면은 따로 보여드리겠습니다. 문의 주세요.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-500">
            대신 보여드릴 자료가 없습니다. 문의 주시면 직접 시연해 드리겠습니다.
          </p>
        )}
      </div>
    </div>
  );
}
