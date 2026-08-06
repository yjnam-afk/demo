import Link from 'next/link';
import { TechCard } from './TechCard';
import { CompositionFlow } from './CompositionFlow';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import type { Industry, PublicTech } from '@/lib/domain/types';

/**
 * 묶음(제품·시나리오) 단위 그룹.
 *
 * 이 화면이 소개하는 대상은 제품이 아니라 기술이다. 제품은 기술을 묶어 보는
 * 기준일 뿐이므로, 그룹 머리는 "무엇을 파는가"가 아니라 "이 제품에 어떤
 * 기술이 들어가 있는가"를 알리는 데까지만 쓴다. 출시 단계·배포 형태 같은
 * 도입 조건은 제품 상세로 미룬다 — 여기 두면 기술 목록이 판매 카탈로그로
 * 읽힌다.
 *
 * 카드 자체는 기술 영역별 보기와 같은 컴포넌트다 — 기준을 바꿔도 같은 기술이
 * 같은 모습으로 보여야 방문자가 두 화면을 별개로 오해하지 않는다.
 */
export function OfferingGroup({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;
  const isProduct = offering.kind === 'product';

  return (
    // 바로가기가 고정 헤더와 바로가기 막대에 가리지 않도록 여백을 둔다.
    <section
      id={offering.id}
      className="scroll-mt-44 border-t border-ink-200 py-10 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
        </div>
        {steps.length > 0 ? (
          <span className="numeric text-sm text-ink-400">{steps.length}단계 구성</span>
        ) : null}
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
        <p className="mt-6 text-sm text-ink-400">준비 중입니다.</p>
      ) : (
        <CompositionFlow steps={steps} />
      )}
    </section>
  );
}

/**
 * 산업 단위 그룹.
 *
 * 기술 목록만 다시 늘어놓으면 기술별 보기를 산업으로 거른 것에 지나지 않는다.
 * 산업 담당자가 확인하려는 것은 "이 산업에서 어디까지 해봤는가" 이므로,
 * 그 산업 기술들의 검증 현황을 먼저 세운다. 같은 기술이라도 산업마다
 * 쌓인 실적이 다르고, 그 차이가 이 화면의 내용이다.
 */
export function IndustryGroup({
  industry,
  products,
  techs,
}: {
  industry: Industry;
  products: ResolvedOffering[];
  techs: PublicTech[];
}) {
  const certified = techs.filter((tech) => tech.verification.level === 'third_party');
  const proven = techs.filter(
    (tech) =>
      tech.business.maturity === 'field_proven' || tech.business.maturity === 'pilot_done',
  );
  const certifiers = [
    ...new Set(certified.map((tech) => tech.verification.body).filter(Boolean)),
  ];

  const stats = [
    { value: `${techs.length}`, unit: '건', label: '적용 기술' },
    certified.length > 0
      ? {
          value: `${certified.length}`,
          unit: '건',
          label: certifiers.length > 0 ? `제3자 인증 · ${certifiers.join(', ')}` : '제3자 인증',
        }
      : null,
    proven.length > 0
      ? { value: `${proven.length}`, unit: '건', label: '현장 적용 · 실증 완료' }
      : null,
  ].filter((stat): stat is { value: string; unit: string; label: string } => stat !== null);

  return (
    <section
      id={industry.id}
      className="scroll-mt-44 border-t border-ink-200 py-10 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold tracking-tight text-ink-900">
          <Link href={`/industries/${industry.id}`} className="hover:underline">
            {industry.label}
          </Link>
        </h3>
        <span className="numeric text-sm text-ink-400">기술 {techs.length}건</span>
      </div>

      {industry.description ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">
          {industry.description}
        </p>
      ) : null}

      {/* 이 산업에서의 실적. 산업마다 값이 달라 이 화면에서만 읽을 수 있다. */}
      {techs.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-ink-200 bg-white px-5 py-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="flex items-baseline gap-1">
                <span className="numeric text-2xl font-semibold text-ink-900">{stat.value}</span>
                <span className="text-xs text-ink-500">{stat.unit}</span>
              </div>
              <div className="mt-0.5 text-xs text-ink-500">{stat.label}</div>
            </div>
          ))}
        </div>
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
