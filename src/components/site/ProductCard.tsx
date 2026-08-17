import Link from 'next/link';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';
import { accentStyle, cn } from '@/lib/ui/domain';

/**
 * 제품 목록 행.
 *
 * 카드 격자는 높이를 맞추려고 요약을 세 줄에서 잘랐다. 행은 전체 폭을
 * 쓰므로 자르지 않는다. 기술 목록 행과 같은 리듬 — 본문 왼쪽, 오른쪽에
 * 고정 폭 기둥. 제품의 오른쪽 기둥은 수치가 아니라 구성 기술 수다.
 */
export function ProductRow({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;

  return (
    <Link
      href={`/products/${offering.id}`}
      className="group grid grid-cols-1 items-start gap-x-6 gap-y-3 border-t border-ink-200 py-6 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_11rem]"
    >
      <div className="min-w-0">
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

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
          <h3 className="text-lg font-semibold tracking-tight text-ink-900 group-hover:underline">
            {offering.title}
          </h3>
          {offering.name_en && offering.name_en !== offering.title ? (
            <span className="text-xs text-ink-500">{offering.name_en}</span>
          ) : null}
        </div>

        {/* 요약 전문 — 자르지 않는다 */}
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600">{offering.summary}</p>

        {steps.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {steps.map(({ tech }) => (
              <span
                key={tech.id}
                className="flex items-center gap-1.5 rounded bg-ink-100 px-2 py-0.5 text-sm text-ink-700"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', accentStyle(tech.domain_accent).dot)} />
                {tech.name_ko}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* 오른쪽 기둥 — 구성 규모와 대상. 기술 행의 수치 기둥과 같은 자리다 */}
      <div className="sm:text-right">
        <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">구성 기술</div>
        <div className="numeric mt-0.5 text-3xl font-semibold text-ink-900">{steps.length}</div>
        {industryLabels.length > 0 ? (
          <div className="mt-1 text-xs leading-relaxed text-ink-500">
            {industryLabels.map((industry) => industry.label).join(' · ')}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
