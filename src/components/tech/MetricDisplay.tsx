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
        const conditions = metric.conditions.filter((c) => c.trim());

        return (
          /*
            읽는 순서를 셀의 구조로 만든다. 한 줄에 여러 정보를 이어 붙이면
            좁은 화면에서 아무 데서나 접혀 무엇이 무엇의 설명인지 흐려진다.
              1) 무엇을 · 누가 확인했나 — 지표명과 검증 칩
              2) 얼마인가 — 큰 수치와 달성 판정
              3) 무엇에 비해 — 목표와 달성률
              4) 어떤 조건에서 — 시험 조건과 데이터셋

            글자색은 흰색 계열만 쓴다. 잉크 사다리(ink-400/500)는 밝은
            배경용 중간 회색이라 이 어두운 판 위에서는 읽히지 않았다.
          */
          <div key={metric.label} className="bg-ink-950 p-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="text-xs font-semibold tracking-[0.1em] text-white/70 uppercase">
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
                      : 'border border-white/25 text-white/75',
                  )}
                >
                  {metric.source}
                </span>
              ) : null}
              {/* 수준 주석 — 인증 칩과 혼동되지 않게 테두리 칩으로 */}
              {metric.benchmark?.trim() ? (
                <span className="inline-flex items-center rounded border border-white/25 px-1.5 py-0.5 text-xs font-medium text-white/75">
                  {metric.benchmark}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <AnimatedNumber
                value={metric.value}
                formatted={formatNumber(metric.value)}
                className="numeric text-4xl font-semibold text-white sm:text-5xl"
              />
              {/* 목표가 없는 지표(인증 성적서 측정값)는 판정이 없다 */}
              {achieved !== null ? <AchievementMark achieved={achieved} /> : null}
            </div>

            {/* 목표는 수치의 해석이므로 바로 아래 한 줄로 따라붙는다 */}
            {targetText ? (
              <p className="mt-2 text-sm text-white/70">
                정량 목표 <span className="numeric text-white/90">{targetText}</span>
                {ratePercent ? (
                  <>
                    <span aria-hidden className="mx-1.5 text-white/30">
                      ·
                    </span>
                    달성률 <span className="numeric text-white/90">{ratePercent}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {/*
              전제 — 시험 조건과 데이터셋.

              조건을 점(·)으로 이어 흘렸더니 어디까지가 한 조건인지 끊어
              읽히지 않았다. 조건 하나가 칩 하나다 — 개수와 경계가 눈으로
              세어진다. 값과 같은 셀 안이라 전제가 빠진 수치가 되지 않는다.
            */}
            {conditions.length > 0 || metric.dataset ? (
              <div className="mt-5 border-t border-white/15 pt-4">
                {conditions.length > 0 ? (
                  <>
                    <div className="text-xs font-semibold tracking-[0.1em] text-white/55 uppercase">
                      시험 조건
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {conditions.map((condition) => (
                        <li
                          key={condition}
                          className="rounded border border-white/15 bg-white/5 px-2 py-1 text-sm text-white/85"
                        >
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {metric.dataset ? (
                  <p className={cn('text-xs text-white/55', conditions.length > 0 ? 'mt-3' : '')}>
                    데이터셋 <span className="text-white/80">{metric.dataset}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
