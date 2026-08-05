import { evaluateMetric, formatNumber, formatRate } from '@/lib/domain/metric';
import type { Metric, PublicMetric } from '@/lib/domain/types';
import { cn } from '@/lib/ui/domain';

type AnyMetric = Metric | PublicMetric;

function AchievementMark({ achieved }: { achieved: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        achieved
          ? 'bg-[var(--color-signal-ok-soft)] text-[var(--color-signal-ok)]'
          : 'bg-[var(--color-signal-warn-soft)] text-[var(--color-signal-warn)]',
      )}
    >
      {achieved ? '목표 달성' : '목표 미달'}
    </span>
  );
}

/**
 * 조건 단서.
 * 지표 값을 렌더링하는 모든 경로가 이 컴포넌트를 함께 부르도록 배치한다.
 * "목표 90 이상"만 떼어 보여주면 "40px 이상 객체 한정" 같은 전제가 빠져 과장이 된다.
 */
function Condition({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <span className="text-xs text-ink-500">· {text}</span>;
}

/** 카드·랜딩에서 크게 노출하는 대표 수치. 숫자가 화면에서 가장 먼저 읽혀야 한다. */
export function MetricStat({
  metric,
  size = 'md',
}: {
  metric: AnyMetric;
  size?: 'md' | 'lg';
}) {
  const { achieved, targetText } = evaluateMetric(metric as Metric);

  return (
    <div>
      <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">{metric.label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            'numeric font-semibold text-ink-900',
            size === 'lg' ? 'text-5xl' : 'text-3xl',
          )}
        >
          {formatNumber(metric.value)}
        </span>
        <span className="text-sm text-ink-500">목표 {targetText}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <AchievementMark achieved={achieved} />
        <Condition text={metric.condition} />
      </div>
    </div>
  );
}

/**
 * 상세 페이지의 성능 지표 블록.
 * 복수 지표를 지원하며, 지표가 없는 기술은 이 컴포넌트를 아예 렌더하지 않는다.
 */
export function MetricTable({ metrics }: { metrics: AnyMetric[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 text-left text-xs tracking-wide text-ink-500 uppercase">
            <th className="py-2 pr-4 font-medium">지표</th>
            <th className="py-2 pr-4 font-medium">목표</th>
            <th className="py-2 pr-4 font-medium">달성</th>
            <th className="py-2 pr-4 font-medium">달성률</th>
            <th className="py-2 font-medium">판정</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const { achieved, rate, targetText } = evaluateMetric(metric as Metric);
            const ratePercent = formatRate(rate);

            return (
              <tr key={metric.label} className="border-b border-ink-100 align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium text-ink-900">{metric.label}</div>
                  {metric.condition?.trim() ? (
                    <div className="mt-0.5 text-xs text-ink-500">{metric.condition}</div>
                  ) : null}
                  {metric.dataset ? (
                    <div className="mt-0.5 text-xs text-ink-400">데이터셋 · {metric.dataset}</div>
                  ) : null}
                </td>
                <td className="numeric py-3 pr-4 text-ink-600">{targetText}</td>
                <td className="numeric py-3 pr-4 text-base font-semibold text-ink-900">
                  {formatNumber(metric.value)}
                </td>
                <td className="numeric py-3 pr-4 text-ink-600">{ratePercent ?? '-'}</td>
                <td className="py-3">
                  <AchievementMark achieved={achieved} />
                  {metric.source ? (
                    <div className="mt-1 text-xs text-ink-400">{metric.source}</div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
