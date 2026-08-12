import type { Metric } from './types';

export interface MetricEvaluation {
  /**
   * 목표 달성 여부. direction 을 반영한 유일한 판정 지점이다.
   * 목표값이 없는 지표(인증 성적서의 측정값 등)는 null — 판정 자체가 없다.
   */
  achieved: boolean | null;
  /**
   * 달성률(1 = 목표 정확히 달성, 1 초과 = 초과 달성).
   * 0 으로 나누는 등 계산이 불가능하면 null 이며, 이때 UI 는 달성률을 감춘다.
   */
  rate: number | null;
  /**
   * "목표 7.0 이하" / "목표 90 이상" 처럼 방향이 드러나는 목표 문구.
   * 목표값이 없으면 null — UI 는 목표 문구를 통째로 생략한다.
   */
  targetText: string | null;
}

/**
 * 지표 달성 판정의 단일 진입점.
 *
 * 화면 컴포넌트는 value 와 target 을 직접 비교하지 않고 반드시 이 함수를 쓴다.
 * 자체 비교를 허용하면 MAE·FID·Mean Angular Error 같은 "낮을수록 좋은" 지표가
 * 초과 달성했음에도 미달로 표시되는 사고가 특정 화면에서만 재발한다.
 */
export function evaluateMetric(metric: Metric): MetricEvaluation {
  const { value, target, direction } = metric;
  if (target === undefined) return { achieved: null, rate: null, targetText: null };

  const lowerIsBetter = direction === 'lower';

  const achieved = lowerIsBetter ? value <= target : value >= target;

  let rate: number | null;
  if (lowerIsBetter) {
    rate = value > 0 ? target / value : null;
  } else {
    rate = target > 0 ? value / target : null;
  }
  if (rate !== null && !Number.isFinite(rate)) rate = null;

  const targetText = `${formatNumber(target)} ${lowerIsBetter ? '이하' : '이상'}`;

  return { achieved, rate, targetText };
}

/** 소수점이 있는 값만 소수점을 남긴다. 90 을 90.00 으로 부풀리지 않는다. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function formatRate(rate: number | null): string | null {
  if (rate === null) return null;
  return `${Math.round(rate * 100)}%`;
}

/**
 * 카드·랜딩에서 대표로 내세울 지표를 고른다.
 * 우선순위는 (1) 명시된 지표, (2) 목표를 달성한 첫 지표, (3) 첫 지표.
 */
export function pickHeadlineMetric(metrics: Metric[], preferredLabel?: string): Metric | null {
  if (metrics.length === 0) return null;
  if (preferredLabel) {
    const named = metrics.find((m) => m.label === preferredLabel);
    if (named) return named;
  }
  return metrics.find((m) => evaluateMetric(m).achieved === true) ?? metrics[0];
}

/**
 * 성과 요약용 집계. 목표가 있는 지표 중 몇 개를 달성했는지 센다.
 * 목표 없는 지표는 분모에서도 뺀다 — 판정이 없는 지표를 미달로 세면 왜곡이다.
 */
export function summarizeAchievement(metricsList: Metric[][]): {
  total: number;
  achieved: number;
} {
  const withTarget = metricsList.flat().filter((m) => m.target !== undefined);
  return {
    total: withTarget.length,
    achieved: withTarget.filter((m) => evaluateMetric(m).achieved === true).length,
  };
}
