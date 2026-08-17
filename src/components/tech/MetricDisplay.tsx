import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
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
function Condition({ items }: { items: string[] }) {
  const kept = items.filter((t) => t.trim());
  if (kept.length === 0) return null;
  return (
    <>
      {kept.map((text) => (
        <span key={text} className="text-xs text-ink-500">
          · {text}
        </span>
      ))}
    </>
  );
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
        <AnimatedNumber
          value={metric.value}
          formatted={formatNumber(metric.value)}
          className={cn(
            'numeric font-semibold text-ink-900',
            size === 'lg' ? 'text-5xl' : 'text-3xl',
          )}
        />
        {/* 목표가 없는 지표(인증 성적서 측정값)는 목표 문구·판정을 생략한다 */}
        {targetText ? <span className="text-sm text-ink-500">정량 목표 {targetText}</span> : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {achieved !== null ? <AchievementMark achieved={achieved} /> : null}
        <Condition items={metric.conditions} />
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
            {/*
              읽는 순서를 셀의 구조로 만든다.
                1) 무엇을 · 누가 확인했나 — 지표명과 검증 칩을 붙여 한 덩어리로
                2) 얼마인가 — 큰 수치와 달성 판정
                3) 무엇에 비해 — 목표와 달성률
                4) 어떤 조건에서 — 시험 조건과 데이터셋
              지표가 하나면 넓은 화면에서 좌우로 나눈다. 한 칸짜리 셀에
              모든 것을 왼쪽에 쌓으면 화면 절반이 빈 채로 남는다.
            */}
            <div>
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                    {metric.label}
                  </span>
                  {/*
                    검증 주체 — 지표명 바로 옆이다. 셀 반대쪽 끝으로 보내면
                    "이 수치를 누가 확인했나" 가 수치와 떨어져 겉돈다.
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
                  {/* 수준 주석 — 인증 칩과 혼동되지 않게 테두리 칩으로 */}
                  {metric.benchmark?.trim() ? (
                    <span className="inline-flex items-center rounded border border-white/20 px-1.5 py-0.5 text-xs font-medium text-ink-300">
                      {metric.benchmark}
                    </span>
                  ) : null}
                </div>

                {/* 수치와 목표는 한 줄 — 목표는 수치의 해석이라 붙어 있어야 한다 */}
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <AnimatedNumber
                    value={metric.value}
                    formatted={formatNumber(metric.value)}
                    className="numeric text-4xl font-semibold text-white sm:text-5xl"
                  />
                  {/* 목표가 없는 지표(인증 성적서 측정값)는 판정이 없다 */}
                  {achieved !== null ? (
                    <span className="self-center">
                      <AchievementMark achieved={achieved} />
                    </span>
                  ) : null}
                  {targetText ? (
                    <span className="text-xs text-ink-500">
                      정량 목표 {targetText}
                      {ratePercent ? <span className="numeric"> · 달성률 {ratePercent}</span> : null}
                    </span>
                  ) : null}
                </div>
              </div>

              {/*
                전제 — 시험 조건과 데이터셋.

                세로 목록을 옆 칸에 세웠더니 왼쪽은 아래가 텅 비고 오른쪽만
                길어져 두 칸의 키가 맞지 않았다. 조건은 짧은 구절들이므로
                가로로 흘려 전체 폭을 한 줄기로 쓴다 — 수치 아래에 놓이는
                띠 하나가 되어 읽는 순서도 위에서 아래로 단순해진다.
              */}
              {metric.conditions.filter((c) => c.trim()).length > 0 || metric.dataset ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  {metric.conditions.filter((c) => c.trim()).length > 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                      <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                        시험 조건
                      </span>
                      {metric.conditions
                        .filter((c) => c.trim())
                        .map((c, index) => (
                          <span key={c} className="flex items-baseline gap-3 text-sm text-ink-300">
                            {index > 0 ? (
                              <span aria-hidden className="text-ink-600">
                                ·
                              </span>
                            ) : null}
                            {c}
                          </span>
                        ))}
                    </div>
                  ) : null}
                  {metric.dataset ? (
                    <div
                      className={cn(
                        'text-xs text-ink-500',
                        metric.conditions.filter((c) => c.trim()).length > 0 ? 'mt-2.5' : '',
                      )}
                    >
                      데이터셋 · {metric.dataset}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
