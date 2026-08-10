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
 * 표시할 지표 목록.
 *
 * 값은 전부 데이터에서 계산한다 — 하드코딩하면 기술이 추가돼도 숫자가 늙는다.
 * 없는 항목은 목록에서 빠진다. 0건 인증을 "0건"으로 세워 두는 것보다 낫다.
 */
function buildStats(summary: PublicSummary): { value: string; unit?: string; label: string }[] {
  const { metrics, certifiers } = summary;
  const achievementRate =
    metrics.total > 0 ? Math.round((metrics.achieved / metrics.total) * 100) : null;

  return [
    { value: String(summary.techCount), unit: '건', label: '공개 기술' },
    summary.thirdPartyCount > 0
      ? {
          value: String(summary.thirdPartyCount),
          unit: '건',
          label: certifiers.length > 0 ? `제3자 인증 · ${certifiers.join(', ')}` : '제3자 인증',
        }
      : null,
    achievementRate !== null
      ? { value: `${metrics.achieved}/${metrics.total}`, label: `정량 목표 달성 · ${achievementRate}%` }
      : null,
    summary.provenCount > 0
      ? { value: String(summary.provenCount), unit: '건', label: '현장 적용 · 실증 완료' }
      : null,
  ].filter((stat): stat is { value: string; unit?: string; label: string } => stat !== null);
}

/**
 * 신뢰 지표 줄.
 *
 * 사업 의사결정자가 카드를 훑기 전에 "믿을 만한 규모인가"를 판단하는 구간이다.
 */
export function TrustBar({
  summary,
  tone = 'dark',
}: {
  summary: PublicSummary;
  tone?: 'dark' | 'light';
}) {
  return (
    <div className="flex flex-wrap gap-x-12 gap-y-6">
      {buildStats(summary).map((stat) => (
        <Stat key={stat.label} {...stat} tone={tone} />
      ))}
    </div>
  );
}

/**
 * 히어로 옆에 세우는 지표 패널.
 *
 * 같은 값을 2×2 격자로 쌓는다. 히어로 배경이 비어 있는 동안 오른쪽 절반이
 * 통째로 여백이었는데, 이 사이트의 얼굴은 수치이므로 그 자리에 수치를 세운다.
 * 셀 사이 실선은 gap-px 밑으로 비치는 배경으로 만든다 — 선을 따로 긋지 않는다.
 */
export function TrustPanel({ summary }: { summary: PublicSummary }) {
  const stats = buildStats(summary);
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-ink-950 p-5">
          <div className="flex items-baseline gap-1">
            <span className="numeric text-3xl font-semibold text-white">{stat.value}</span>
            {stat.unit ? <span className="text-sm text-ink-400">{stat.unit}</span> : null}
          </div>
          <div className="mt-1 text-sm leading-snug text-ink-400">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
