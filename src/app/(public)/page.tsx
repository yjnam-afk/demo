import Link from 'next/link';
import { ContactCta } from '@/components/site/ContactCta';
import { DomainPillars } from '@/components/site/DomainPillars';
import { Hero } from '@/components/site/Hero';
import { TrustBar } from '@/components/site/TrustBar';
import { TechCard } from '@/components/tech/TechCard';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';

/**
 * 저장소를 매 요청 읽는다.
 * 기본값인 정적 프리렌더로 두면 관리자가 기술을 등록·수정·발행해도 빌드를 다시
 * 하기 전까지 랜딩이 바뀌지 않는다. 데이터는 로컬 JSON 이라 읽기 비용이 작다.
 */
export const dynamic = 'force-dynamic';

/** 히어로와 대표 데모에 쓸 만큼만 앞에서 가져온다. 전체 목록을 훑지 않는다. */
const LANDING_POOL = 8;
const FEATURED_COUNT = 4;

/**
 * 구간 머리.
 *
 * 구간마다 제목 크기와 여백이 조금씩 다르면 페이지가 여러 사람이 붙인
 * 조각처럼 보인다. 하나로 묶어 리듬을 고정한다.
 */
function SectionHead({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
        {lead ? <p className="mt-3 text-sm leading-relaxed text-ink-500">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 border-b border-ink-300 pb-1 text-sm text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
    >
      {children} →
    </Link>
  );
}

export default async function HomePage() {
  const repo = getRepo();
  const [page, summary, facets, products] = await Promise.all([
    repo.listPublic({ limit: LANDING_POOL }),
    repo.publicSummary(),
    repo.publicFacets(),
    listPublicOfferings('product'),
  ]);

  /* 산업 칩 옆에 붙일 건수. 실제 공개 기술에서 집계된 값만 쓴다. */
  const industryCounts = new Map(
    facets.industries.map((industry) => [industry.value, industry.count]),
  );

  const maps = await loadPublicMaps(repo);
  const techs = page.items.map((tech) => toPublicTech(tech, maps.labels, maps.domains));

  const featured = techs.slice(0, FEATURED_COUNT);

  return (
    <>
      {/* 첫 문장에 들어갈 축 이름. 관리자가 대분류를 고치면 문장도 따라 바뀐다. */}
      <Hero axes={maps.domainList.map((domain) => domain.label)} />

      {/* 성과 요약 — 주장 바로 다음에 근거를 놓는다 */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <TrustBar summary={summary} tone="light" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/*
          데모가 가장 먼저 온다.
          이 사이트의 목적은 기술을 직접 돌려보게 하는 것이다. 제품 소개나
          영역 설명을 앞에 세우면 회사 소개 페이지가 되고, 정작 방문자가
          보러 온 것은 스크롤 아래로 밀린다.
        */}
        {featured.length > 0 ? (
          <section className="py-16 sm:py-20">
            <SectionHead
              title="대표 기술"
              action={
                summary.techCount > featured.length ? (
                  <MoreLink href="/tech">전체 {summary.techCount}건 보기</MoreLink>
                ) : null
              }
            />
            {/* 열 수는 화면 폭으로만 정한다. 대표 수가 3개든 4개든 무너지지 않는다. */}
            <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featured.map((tech) => (
                <TechCard key={tech.id} tech={tech} />
              ))}
            </div>
          </section>
        ) : null}

        {/* 무엇을 하는 조직인지 — 데모를 본 다음에 온다 */}
        <section className="border-t border-ink-200 py-16 sm:py-20">
          <SectionHead
            title="기술 영역"
          />
          <div className="mt-10">
            <DomainPillars domains={maps.domainList} counts={summary.domainCounts} />
          </div>
        </section>

        {/*
          적용 현장.
          화면을 어떻게 쓰는지가 아니라 기술이 어디에 들어가 있는지를 말한다.
          "다른 기준으로 찾아보실 수 있습니다" 처럼 조작을 설명하는 문구는
          방문자에게 아무것도 알려 주지 않는다.
        */}
        <section className="border-t border-ink-200 py-16 sm:py-20">
          <SectionHead
            title="적용 현장"
          />

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col rounded-lg border border-ink-200 bg-white p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink-900">산업</h3>
                <span className="numeric text-sm text-ink-400">
                  {maps.industryList.length}개 분야
                </span>
              </div>
              <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                {maps.industryList.map((industry) => {
                  const count = industryCounts.get(industry.id) ?? 0;
                  return (
                    <Link
                      key={industry.id}
                      href={`/industries/${industry.id}`}
                      className="flex items-baseline gap-1.5 rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
                    >
                      {industry.label}
                      {/* 어느 산업에 얼마나 쌓였는지가 이 칩의 정보다 */}
                      {count > 0 ? (
                        <span className="numeric text-xs text-ink-400">{count}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-6">
                <MoreLink href="/tech?view=industry">산업별 보기</MoreLink>
              </div>
            </div>
            {products.length > 0 ? (
              <div className="flex flex-col rounded-lg border border-ink-200 bg-white p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink-900">제품</h3>
                  <span className="numeric text-sm text-ink-400">{products.length}개</span>
                </div>
                <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                  {products.map(({ offering }) => (
                    <Link
                      key={offering.id}
                      href={`/products/${offering.id}`}
                      className="rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
                    >
                      {offering.title}
                    </Link>
                  ))}
                </div>
                <div className="mt-6">
                  <MoreLink href="/products">제품 보기</MoreLink>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <ContactCta />
    </>
  );
}
