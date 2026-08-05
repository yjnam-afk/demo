import type { PublicSummary } from '@/lib/data/repository';
import { cn } from '@/lib/ui/domain';

function Stat({
  value,
  unit,
  label,
  tone = 'dark',
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'numeric text-3xl font-semibold sm:text-4xl',
            tone === 'dark' ? 'text-white' : 'text-ink-900',
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className={cn('text-sm', tone === 'dark' ? 'text-ink-400' : 'text-ink-500')}>
            {unit}
          </span>
        ) : null}
      </div>
      <div className={cn('mt-1 text-sm', tone === 'dark' ? 'text-ink-400' : 'text-ink-500')}>
        {label}
      </div>
    </div>
  );
}

/**
 * 신뢰 지표 줄.
 *
 * 사업 의사결정자가 카드를 훑기 전에 "믿을 만한 규모인가"를 판단하는 구간이다.
 * 값은 전부 데이터에서 계산한다 — 하드코딩하면 기술이 추가돼도 숫자가 늙는다.
 */
export function TrustBar({
  summary,
  tone = 'dark',
}: {
  summary: PublicSummary;
  tone?: 'dark' | 'light';
}) {
  const { metrics, certifiers } = summary;
  const achievementRate =
    metrics.total > 0 ? Math.round((metrics.achieved / metrics.total) * 100) : null;

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6">
      <Stat value={String(summary.techCount)} unit="건" label="공개 기술" tone={tone} />

      {summary.thirdPartyCount > 0 ? (
        <Stat
          value={String(summary.thirdPartyCount)}
          unit="건"
          label={certifiers.length > 0 ? `제3자 인증 · ${certifiers.join(', ')}` : '제3자 인증'}
          tone={tone}
        />
      ) : null}

      {achievementRate !== null ? (
        <Stat
          value={`${metrics.achieved}/${metrics.total}`}
          label={`정량 목표 달성 · ${achievementRate}%`}
          tone={tone}
        />
      ) : null}

      {summary.provenCount > 0 ? (
        <Stat
          value={String(summary.provenCount)}
          unit="건"
          label="현장 적용 · 실증 완료"
          tone={tone}
        />
      ) : null}
    </div>
  );
}
