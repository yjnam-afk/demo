import { ApiDemo } from './ApiDemo';
import { EmbedDemo } from './EmbedDemo';
import { MetricDemo } from './MetricDemo';
import { VideoDemo } from './VideoDemo';
import type { FallbackContent } from './DemoFallback';
import { pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicTech } from '@/lib/domain/types';

/**
 * 데모 슬롯 — 타입별 분기는 여기 한 곳뿐이다.
 *
 * 기술별 커스텀 화면을 만들지 않기 위해, 상세 페이지는 이 컴포넌트만 호출하고
 * 어떤 기술인지 신경 쓰지 않는다. 새 기술이 늘어도 분기는 그대로 4개다.
 */
export function DemoSlot({ tech }: { tech: PublicTech }) {
  // 실패 시 대체할 자료를 미리 계산해 모든 데모 타입이 같은 폴백을 공유한다.
  // 영상 → 대표 수치 → 썸네일 순으로 물러난다.
  const fallback: FallbackContent = {
    video: tech.media.video,
    video_webm: tech.media.video_webm,
    poster: tech.media.thumbnail,
    metric: pickHeadlineMetric(tech.metrics as never),
    thumbnail: tech.media.thumbnail,
  };

  switch (tech.demo.type) {
    case 'api':
      return (
        <ApiDemo
          techId={tech.id}
          inputKind={tech.demo.input_kind}
          samples={tech.demo.samples}
          fallback={fallback}
        />
      );
    case 'embed':
      return <EmbedDemo techId={tech.id} title={`${tech.name_ko} 데모`} fallback={fallback} />;
    case 'video':
      return (
        <VideoDemo
          src={tech.demo.src}
          srcWebm={tech.demo.src_webm}
          poster={tech.demo.poster}
          fallback={fallback}
        />
      );
    case 'metric':
      return <MetricDemo metrics={tech.metrics} highlight={tech.demo.highlight_metric} />;
  }
}
