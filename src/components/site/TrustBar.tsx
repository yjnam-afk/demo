import type { PublicSummary } from '@/lib/data/repository';

function Cell({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  /** 하단 헤어라인 위에 붙는 근거 — 인증기관, 달성률 */
  note?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-ink-950 p-6 sm:p-7">
      <div className="text-xs font-medium tracking-wide text-ink-400 uppercase">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="numeric text-4xl font-semibold text-white sm:text-5xl">{value}</span>
        {unit ? <span className="text-sm text-ink-400">{unit}</span> : null}
      </div>
      {note ? (
        <div className="mt-auto border-t border-white/10 pt-2.5 text-xs text-ink-500">
          <div className="mt-2">{note}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 신뢰 지표 밴드.
 *
 * 사업 의사결정자가 카드를 훑기 전에 "믿을 만한 규모인가"를 판단하는 구간이다.
 * 값은 전부 데이터에서 계산한다 — 하드코딩하면 기술이 추가돼도 숫자가 늙는다.
 *
 * 상세 화면의 성능 지표판과 같은 문법으로 세운다 — 어두운 판, 위에 작은
 * 라벨, 큰 숫자, 하단 헤어라인 위의 근거. 이 사이트에서 숫자는 언제나
 * 어두운 판 위에 선다는 규칙이 첫 화면에서부터 반복된다.
 */
export function TrustBar({ summary }: { summary: PublicSummary }) {
  const { metrics, certifiers } = summary;
  const achievementRate =
    metrics.total > 0 ? Math.round((metrics.achieved / metrics.total) * 100) : null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 lg:grid-cols-4">
      <Cell label="공개 기술" value={String(summary.techCount)} unit="건" />

      {summary.thirdPartyCount > 0 ? (
        <Cell
          label="제3자 인증"
          value={String(summary.thirdPartyCount)}
          unit="건"
          note={
            certifiers.length > 0 ? (
              // 기관 이름이 이 칸의 근거다 — 신뢰색으로 세운다
              <span className="font-medium text-[var(--color-signal-ok-bright)]">
                {certifiers.join(' · ')}
              </span>
            ) : undefined
          }
        />
      ) : null}

      {achievementRate !== null ? (
        <Cell
          label="정량 목표 달성"
          value={`${metrics.achieved}/${metrics.total}`}
          note={<span className="numeric text-ink-400">달성률 {achievementRate}%</span>}
        />
      ) : null}

      {summary.provenCount > 0 ? (
        <Cell label="현장 적용 · 실증 완료" value={String(summary.provenCount)} unit="건" />
      ) : null}
    </div>
  );
}
