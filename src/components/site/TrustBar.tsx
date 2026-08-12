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
    <div className="flex flex-col bg-white p-6 sm:p-7">
      {/* 라벨 옆 틱은 상세 화면 구간 제목과 같은 문법 — 브랜드색 하나로 통일 */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-3.5 w-1 rounded-full bg-[var(--color-brand)]" />
        <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="numeric text-4xl font-semibold text-ink-900 sm:text-5xl">{value}</span>
        {unit ? <span className="text-sm text-ink-500">{unit}</span> : null}
      </div>
      {note ? (
        <div className="mt-auto border-t border-ink-100 pt-2.5">
          <div className="mt-1.5 text-xs">{note}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 신뢰 지표 밴드.
 *
 * 사업 의사결정자가 목록을 훑기 전에 "믿을 만한 규모인가"를 판단하는 구간이다.
 * 값은 전부 데이터에서 계산한다 — 하드코딩하면 기술이 추가돼도 숫자가 늙는다.
 *
 * 밝은 셀 격자로 세운다. 어두운 판은 히어로 바로 아래에서 화면을 무겁게
 * 눌렀다 — 어두운 판은 상세 화면의 성능 지표에 남겨 두고, 여기서는 상세
 * 화면 밝은 구간의 문법(브랜드색 틱 + 라벨)을 쓴다.
 */
export function TrustBar({ summary }: { summary: PublicSummary }) {
  const { metrics, certifiers } = summary;
  const achievementRate =
    metrics.total > 0 ? Math.round((metrics.achieved / metrics.total) * 100) : null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 lg:grid-cols-4">
      <Cell label="공개 기술" value={String(summary.techCount)} unit="건" />

      {summary.thirdPartyCount > 0 ? (
        <Cell
          label="제3자 인증"
          value={String(summary.thirdPartyCount)}
          unit="건"
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
          label="정량 목표 달성"
          value={`${metrics.achieved}/${metrics.total}`}
          note={<span className="numeric text-ink-500">달성률 {achievementRate}%</span>}
        />
      ) : null}

      {summary.provenCount > 0 ? (
        <Cell label="현장 적용 · 실증 완료" value={String(summary.provenCount)} unit="건" />
      ) : null}
    </div>
  );
}
