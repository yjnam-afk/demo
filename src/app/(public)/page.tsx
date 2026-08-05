import Link from 'next/link';
import { ContactCta } from '@/components/site/ContactCta';
import { DomainPillars } from '@/components/site/DomainPillars';
import { Hero } from '@/components/site/Hero';
import { TrustBar } from '@/components/site/TrustBar';
import { TechCard } from '@/components/tech/TechCard';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { industryLabelMap, toPublicTech } from '@/lib/domain/publicView';

/**
 * 저장소를 매 요청 읽는다.
 * 기본값인 정적 프리렌더로 두면 관리자가 기술을 등록·수정·발행해도 빌드를 다시
 * 하기 전까지 랜딩이 바뀌지 않는다. 데이터는 로컬 JSON 이라 읽기 비용이 작다.
 */
export const dynamic = 'force-dynamic';

/** 히어로와 피처드에 쓸 만큼만 앞에서 가져온다. 전체 목록을 훑지 않는다. */
const LANDING_POOL = 8;
const FEATURED_COUNT = 4;

export default async function HomePage() {
  const repo = getRepo();
  const [page, summary, industries, products] = await Promise.all([
    repo.listPublic({ limit: LANDING_POOL }),
    repo.publicSummary(),
    repo.listIndustries(),
    listPublicOfferings('product'),
  ]);

  const labels = industryLabelMap(industries);
  const techs = page.items.map((tech) => toPublicTech(tech, labels));

  // 대표 데모는 순서가 가장 앞선 기술 중 재생할 영상이 있는 것으로 고른다.
  // 특정 기술 id 를 박아 두면 관리자가 순서를 바꿔도 히어로가 따라오지 않는다.
  const hero = techs.find((tech) => tech.media.video) ?? null;

  // 피처드도 순서가 정한다 — 관리자의 순서 변경이 곧 노출 우선순위다.
  const featured = techs.slice(0, FEATURED_COUNT);

  return (
    <>
      <Hero tech={hero} />

      {/* 성과 요약 — 3축을 보기 전에 규모와 검증 수준을 먼저 읽게 한다 */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <TrustBar summary={summary} tone="light" />
          <p className="mt-6 text-xs text-ink-400">{BRAND.proofLead}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/*
          제품이 기술보다 먼저 온다.
          방문자는 사업 의사결정자이므로 "무엇을 살 수 있나"를 먼저 보고,
          그 근거로 "어떤 기술로 만들었나"를 확인한다.
        */}
        {products.length > 0 ? (
          <section className="py-16">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink-900">제품</h2>
                <p className="mt-2 text-sm text-ink-500">현장에 바로 적용할 수 있는 단위입니다.</p>
              </div>
              <Link href="/tech?view=product" className="text-sm text-ink-600 hover:text-ink-900">
                제품 전체 보기 →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {products.slice(0, 4).map(({ offering, steps }) => (
                <Link
                  key={offering.id}
                  href={`/products/${offering.id}`}
                  className="flex flex-col rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-ink-400"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-ink-900">{offering.title}</h3>
                    {offering.name_en && offering.name_en !== offering.title ? (
                      <span className="text-xs text-ink-400">{offering.name_en}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {offering.problem}
                  </p>
                  <p className="mt-4 text-xs text-ink-500">구성 기술 {steps.length}개</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* 산업별 입구 — 새 데이터가 아니라 기존 태그를 뒤집어 보여주는 화면이다 */}
        <section className="border-t border-ink-200 py-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">산업별로 찾기</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {industries.map((industry) => (
              <Link
                key={industry.id}
                href={`/industries/${industry.id}`}
                className="rounded border border-ink-300 bg-white px-4 py-2 text-sm text-ink-700 hover:border-ink-500"
              >
                {industry.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-ink-200 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">기술 영역</h2>
          <p className="mt-2 text-sm text-ink-500">
            세 축의 기술을 조합해 현장의 문제를 해결합니다.
          </p>
          <div className="mt-8">
            <DomainPillars counts={summary.domainCounts} />
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="pb-20">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink-900">대표 기술</h2>
                <p className="mt-2 text-sm text-ink-500">
                  각 기술의 성능은 평가 데이터셋과 측정 조건을 함께 공개합니다.
                </p>
              </div>
              {/* 피처드가 전체를 이미 덮으면 "전체 보기"는 같은 화면을 가리킨다 */}
              {summary.techCount > featured.length ? (
                <Link href="/tech" className="text-sm text-ink-600 hover:text-ink-900">
                  전체 {summary.techCount}건 보기 →
                </Link>
              ) : null}
            </div>

            {/* 열 수는 화면 폭으로만 정한다. 피처드 수가 3개든 4개든 무너지지 않는다. */}
            <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featured.map((tech) => (
                <TechCard key={tech.id} tech={tech} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <ContactCta />
    </>
  );
}
