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
 *
 * 표로 두면 페이지에서 가장 중요한 숫자가 본문 글자 크기로 줄어들어 다른
 * 정의 목록과 구분되지 않는다. 이 사이트의 얼굴은 수치이므로, 지표만은
 * 어두운 판에 큰 숫자로 세운다 — 페이지에서 가장 무거운 블록이 된다.
 *
 * 표가 담던 정보(목표·달성·달성률·판정·조건·데이터셋·출처)는 전부 셀 안에
 * 남는다. 특히 조건 단서는 값 바로 옆이다 — 떼어 놓으면 과장이 된다.
 */
export function MetricStatGrid({ metrics }: { metrics: AnyMetric[] }) {
  return (
    <div
      className={cn(
        // 셀 사이 실선은 gap-px 밑으로 비치는 배경으로 만든다. 선을 따로 긋지 않는다.
        'grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10',
        metrics.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
      )}
    >
      {metrics.map((metric) => {
        const { achieved, rate, targetText } = evaluateMetric(metric as Metric);
        const ratePercent = formatRate(rate);

        return (
          <div key={metric.label} className="bg-ink-950 p-6">
            <div className="text-xs font-medium tracking-wide text-ink-400 uppercase">
              {metric.label}
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="numeric text-4xl font-semibold text-white sm:text-5xl">
                {formatNumber(metric.value)}
              </span>
              <span className="text-sm text-ink-400">목표 {targetText}</span>
              {ratePercent ? (
                <span className="numeric text-sm text-ink-400">달성률 {ratePercent}</span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <AchievementMark achieved={achieved} />
              {/*
                검증 주체는 판정 옆 칩으로 세운다. 하단 잔글씨에 두면 인증이
                데이터셋 이름에 묻힌다 — 인증 수치와 자체 시험 수치는 무게가
                다르고, 그 차이가 이 셀에서 읽혀야 한다.
              */}
              {metric.source?.trim() ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                    /인증/.test(metric.source)
                      ? 'bg-[var(--color-signal-ok-soft)] text-[var(--color-signal-ok)]'
                      : 'border border-white/20 text-ink-400',
                  )}
                >
                  {metric.source}
                </span>
              ) : null}
              {/* 조건 단서 — 값과 떨어지지 않는다. 어두운 판이라 밝은 회색으로 올린다. */}
              {metric.condition?.trim() ? (
                <span className="text-xs text-ink-400">· {metric.condition}</span>
              ) : null}
            </div>

            {metric.dataset ? (
              <div className="mt-3 border-t border-white/10 pt-2.5 text-xs text-ink-500">
                데이터셋 · {metric.dataset}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
