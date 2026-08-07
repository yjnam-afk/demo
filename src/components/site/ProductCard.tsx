import Link from 'next/link';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';
import { accentStyle, cn } from '@/lib/ui/domain';

/** 카드에 이름을 다 늘어놓으면 줄 수가 제품마다 달라져 격자가 흔들린다. */
const VISIBLE_TECHS = 3;

/**
 * 제품 카드.
 *
 * 기술 카드와 달리 시각 슬롯을 두지 않는다. 제품 자체의 화면이 있는 것은
 * 일곱 중 하나뿐이고, 그 하나도 구성 기술의 데모 영상을 빌려 쓴 것이라
 * 제품 화면인 양 걸리면 사실과 다르다. 나머지 여섯은 빈 칸이 된다.
 *
 * 대신 구성 기술을 카드에서 가장 밀도 있는 자리에 둔다. 이 포털에서 제품은
 * 기술을 찾아가는 경로이지 그 자체가 목적이 아니다.
 *
 * 카드 전체가 상세로 가는 링크라 기술 이름은 글자로만 둔다 — 링크 안에
 * 링크를 넣을 수 없다. 기술로 바로 가는 길은 상세 화면이 맡는다.
 */
export function ProductCard({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;
  const shown = steps.slice(0, VISIBLE_TECHS);
  const hidden = steps.length - shown.length;

  return (
    <Link
      href={`/products/${offering.id}`}
      className="group flex h-full flex-col rounded-lg border border-ink-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-lg hover:shadow-ink-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-700"
    >
      {offering.release || offering.deployment?.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {offering.release ? (
            <span className="rounded border border-ink-300 px-2 py-0.5 text-ink-600">
              {RELEASE_STAGE_LABELS[offering.release]}
            </span>
          ) : null}
          {offering.deployment?.map((deployment) => (
            <span key={deployment} className="rounded border border-ink-300 px-2 py-0.5 text-ink-600">
              {DEPLOYMENT_LABELS[deployment]}
            </span>
          ))}
        </div>
      ) : null}

      <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink-900 group-hover:underline">
        {offering.title}
      </h3>
      {offering.name_en && offering.name_en !== offering.title ? (
        <p className="mt-0.5 text-xs text-ink-400">{offering.name_en}</p>
      ) : null}

      <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-ink-600">{offering.summary}</p>

      {/* 아래 칸은 카드 높이와 상관없이 바닥에 붙어, 격자를 훑을 때 같은 줄에서 읽힌다. */}
      <div className="mt-auto border-t border-ink-100 pt-3.5">
        {steps.length > 0 ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                구성 기술
              </span>
              <span className="numeric text-xs text-ink-500">{steps.length}개</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shown.map(({ tech }) => (
                <span
                  key={tech.id}
                  className="flex items-center gap-1.5 rounded bg-ink-100 px-2 py-0.5 text-sm text-ink-700"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', accentStyle(tech.domain_accent).dot)} />
                  {tech.name_ko}
                </span>
              ))}
              {hidden > 0 ? (
                <span className="numeric px-1 py-0.5 text-sm text-ink-400">+{hidden}</span>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-400">구성 기술 준비 중</p>
        )}

        {industryLabels.length > 0 ? (
          <p className="mt-3 text-xs text-ink-500">
            대상 · {industryLabels.map((industry) => industry.label).join(', ')}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
