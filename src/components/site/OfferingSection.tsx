import Link from 'next/link';
import { CompositionFlow } from '@/components/tech/CompositionFlow';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';
import type { PublicTech, Solution } from '@/lib/domain/types';

export interface ResolvedStep {
  role: string;
  tech: PublicTech;
}

export interface ResolvedOffering {
  offering: Solution;
  steps: ResolvedStep[];
  /** 산업군 라벨 (id 는 화면에 내보내지 않는다) */
  industryLabels: { id: string; label: string }[];
}

/**
 * 묶음의 내용.
 *
 * 제목과 번호를 포함하지 않는다. 목록에서는 제목을 세워야 하고 상세 화면에서는
 * 머리에 이미 제목이 있어서, 여기에 제목을 넣어 두면 상세 화면에서 이름과
 * 요약이 두 번씩 나온다.
 */
export function OfferingBody({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;
  const isProduct = offering.kind === 'product';

  return (
    <>
      {isProduct && (offering.release || offering.deployment?.length) ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {offering.release ? (
            <span className="rounded border border-ink-300 bg-white px-2 py-0.5 text-ink-600">
              {RELEASE_STAGE_LABELS[offering.release]}
            </span>
          ) : null}
          {offering.deployment?.map((deployment) => (
            <span
              key={deployment}
              className="rounded border border-ink-300 bg-white px-2 py-0.5 text-ink-600"
            >
              {DEPLOYMENT_LABELS[deployment]}
            </span>
          ))}
        </div>
      ) : null}

      {/* 기술 나열보다 문제가 먼저 온다 — 기술 상세 화면과 같은 원칙이다 */}
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-800">{offering.problem}</p>
      {offering.summary ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">{offering.summary}</p>
      ) : null}

      {industryLabels.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">대상</span>
          {industryLabels.map((industry) => (
            <Link
              key={industry.id}
              href={`/industries/${industry.id}`}
              className="rounded bg-ink-100 px-2 py-0.5 text-sm text-ink-700 hover:bg-ink-200"
            >
              {industry.label}
            </Link>
          ))}
        </div>
      ) : null}

      {steps.length === 0 ? (
        <p className="mt-8 text-sm text-ink-400">상세 구성과 도입 사례는 문의 주시면 보내드립니다.</p>
      ) : (
        <div className="mt-8">
          {/* 하나뿐이면 "1단계" 라고 쓰지 않는다 — 순서가 없는데 순서를 말하는 꼴이 된다. */}
          <h3 className="text-sm font-medium text-ink-700">
            {steps.length > 1 ? `${steps.length}단계 구성` : '구성 기술'}
          </h3>
          {/*
            격자로 늘어놓으면 기술 목록과 같은 화면이 된다. 제품에서 알고 싶은
            것은 개별 성능이 아니라 무엇이 어떤 순서로 맞물리는가다.
          */}
          <CompositionFlow steps={steps} />
        </div>
      )}
    </>
  );
}

/**
 * 묶음 하나를 목록에 세우는 블록.
 *
 * 여러 개를 이어 붙이는 화면(현장 구성)에서만 쓴다. 상세 화면은 머리에 제목이
 * 따로 있으므로 OfferingBody 만 가져다 쓴다.
 */
export function OfferingSection({
  item,
  index,
  headingLevel = 'h2',
}: {
  item: ResolvedOffering;
  index: number;
  headingLevel?: 'h2' | 'h3';
}) {
  const { offering } = item;
  const Heading = headingLevel;

  return (
    <section className="border-b border-ink-200 py-14 last:border-b-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="numeric text-sm font-semibold text-ink-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <Heading className="text-2xl font-semibold tracking-tight text-ink-900">
          {offering.title}
        </Heading>
        {offering.name_en && offering.name_en !== offering.title ? (
          <span className="text-sm text-ink-400">{offering.name_en}</span>
        ) : null}
      </div>

      <OfferingBody item={item} />
    </section>
  );
}
