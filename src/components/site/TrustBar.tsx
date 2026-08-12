import type { PublicSummary } from '@/lib/data/repository';

function Cell({
  value,
  unit,
  label,
  note,
}: {
  value: string;
  unit?: string;
  label: string;
  /** 라벨 아래 붙는 부연 — 인증기관, 달성률 같은 근거 */
  note?: React.ReactNode;
}) {
  return (
    <div className="bg-white px-6 py-7 sm:px-7">
      <div className="flex items-baseline gap-1.5">
        <span className="numeric text-4xl font-semibold text-ink-900 sm:text-5xl">{value}</span>
        {unit ? <span className="text-sm text-ink-500">{unit}</span> : null}
      </div>
      <div className="mt-2.5 text-sm font-medium text-ink-700">{label}</div>
      {note ? <div className="mt-0.5 text-xs text-ink-400">{note}</div> : null}
    </div>
  );
}

/**
 * 신뢰 지표 밴드.
 *
 * 사업 의사결정자가 카드를 훑기 전에 "믿을 만한 규모인가"를 판단하는 구간이다.
 * 값은 전부 데이터에서 계산한다 — 하드코딩하면 기술이 추가돼도 숫자가 늙는다.
 *
 * 숫자를 왼쪽에 흘려 두면 여백만 넓은 빈 줄로 읽힌다. 상세 화면의 성능
 * 지표판과 같은 문법(칸 사이 헤어라인, 큰 숫자, 라벨과 근거의 분리)으로
 * 화면 폭을 채우는 격자를 세운다.
 */
export function TrustBar({ summary }: { summary: PublicSummary }) {
  const { metrics, certifiers } = summary;
  const achievementRate =
    metrics.total > 0 ? Math.round((metrics.achieved / metrics.total) * 100) : null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 lg:grid-cols-4">
      <Cell value={String(summary.techCount)} unit="건" label="공개 기술" />

      {summary.thirdPartyCount > 0 ? (
        <Cell
          value={String(summary.thirdPartyCount)}
          unit="건"
          label="제3자 인증"
          note={
            certifiers.length > 0 ? (
              // 기관 이름이 이 칸의 근거다 — 신뢰색으로 세운다
              <span className="font-medium text-[var(--color-signal-ok)]">
                {certifiers.join(' · ')}
              </span>
            ) : undefined
          }
        />
      ) : null}

      {achievementRate !== null ? (
        <Cell
          value={`${metrics.achieved}/${metrics.total}`}
          label="정량 목표 달성"
          note={<span className="numeric">달성률 {achievementRate}%</span>}
        />
      ) : null}

      {summary.provenCount > 0 ? (
        <Cell value={String(summary.provenCount)} unit="건" label="현장 적용 · 실증 완료" />
      ) : null}
    </div>
  );
}
