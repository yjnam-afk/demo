import Link from 'next/link';
import { TechCard } from './TechCard';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';
import type { Industry, PublicTech } from '@/lib/domain/types';

/**
 * 묶음(제품·시나리오) 단위 그룹.
 *
 * 그룹 머리에 무엇을 도입하는지가 오고, 그 아래에 근거가 되는 기술 카드가 온다.
 * 카드 자체는 기술별 보기와 같은 컴포넌트다 — 기준을 바꿔도 같은 기술이
 * 같은 모습으로 보여야 방문자가 두 화면을 별개로 오해하지 않는다.
 */
export function OfferingGroup({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;
  const isProduct = offering.kind === 'product';

  return (
    <section className="border-t border-ink-200 py-10 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-xl font-semibold tracking-tight text-ink-900">
          {isProduct ? (
            <Link href={`/products/${offering.id}`} className="hover:underline">
              {offering.title}
            </Link>
          ) : (
            offering.title
          )}
        </h3>
        {offering.name_en && offering.name_en !== offering.title ? (
          <span className="text-sm text-ink-400">{offering.name_en}</span>
        ) : null}

        {isProduct && offering.release ? (
          <span className="rounded border border-ink-300 px-2 py-0.5 text-xs text-ink-600">
            {RELEASE_STAGE_LABELS[offering.release]}
          </span>
        ) : null}
        {isProduct
          ? offering.deployment?.map((deployment) => (
              <span
                key={deployment}
                className="rounded border border-ink-300 px-2 py-0.5 text-xs text-ink-600"
              >
                {DEPLOYMENT_LABELS[deployment]}
              </span>
            ))
          : null}
      </div>

      <p className="mt-3 max-w-3xl leading-relaxed text-ink-700">{offering.problem}</p>

      {industryLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {industryLabels.map((industry) => (
            <span key={industry.id} className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
              {industry.label}
            </span>
          ))}
        </div>
      ) : null}

      {steps.length === 0 ? (
        <p className="mt-6 text-sm text-ink-400">구성 기술은 정리되는 대로 공개합니다.</p>
      ) : (
        <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ role, tech }) => (
            <div key={tech.id} className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed text-ink-600">{role}</p>
              <div className="flex-1">
                <TechCard tech={tech} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 산업군 단위 그룹 — 그 산업에 걸린 제품과 기술을 함께 보여준다. */
export function IndustryGroup({
  industry,
  products,
  techs,
}: {
  industry: Industry;
  products: ResolvedOffering[];
  techs: PublicTech[];
}) {
  return (
    <section className="border-t border-ink-200 py-10 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold tracking-tight text-ink-900">
          <Link href={`/industries/${industry.id}`} className="hover:underline">
            {industry.label}
          </Link>
        </h3>
        <span className="numeric text-sm text-ink-400">
          제품 {products.length} · 기술 {techs.length}
        </span>
      </div>

      {industry.description ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">
          {industry.description}
        </p>
      ) : null}

      {products.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {products.map(({ offering }) => (
            <Link
              key={offering.id}
              href={`/products/${offering.id}`}
              className="rounded border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 hover:border-ink-500"
            >
              {offering.title}
            </Link>
          ))}
        </div>
      ) : null}

      {techs.length > 0 ? (
        <div className="mt-5 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {techs.map((tech) => (
            <TechCard key={tech.id} tech={tech} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-400">공개된 기술이 아직 없습니다.</p>
      )}
    </section>
  );
}
