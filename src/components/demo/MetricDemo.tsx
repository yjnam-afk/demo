import { MetricStat } from '@/components/tech/MetricDisplay';
import { pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicMetric } from '@/lib/domain/types';

/**
 * metric 타입 — 실행 가능한 데모가 없는 기술.
 * 대표 수치를 크게 세우고 나머지 지표는 아래 성능 지표 블록이 이어받는다.
 */
export function MetricDemo({
  metrics,
  highlight,
}: {
  metrics: PublicMetric[];
  highlight?: string;
}) {
  const headline = pickHeadlineMetric(metrics as never, highlight);

  if (!headline) {
    return (
      <div className="rounded-lg border border-ink-200 bg-white p-6 text-sm text-ink-500">
        화면으로 시연할 항목이 없어 성능 수치로 대신합니다. 직접 확인이 필요하시면 문의해 주십시오.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-6">
      <MetricStat metric={headline} size="lg" />
      {headline.dataset ? (
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-400">
          평가 데이터셋 · {headline.dataset}
          {headline.source ? ` · ${headline.source}` : ''}
        </p>
      ) : null}
    </div>
  );
}
