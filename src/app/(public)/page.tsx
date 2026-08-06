import Link from 'next/link';
import { ContactCta } from '@/components/site/ContactCta';
import { DomainPillars } from '@/components/site/DomainPillars';
import { Hero } from '@/components/site/Hero';
import { TrustBar } from '@/components/site/TrustBar';
import { TechCard } from '@/components/tech/TechCard';
import { BRAND } from '@/lib/brand';
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
  eyebrow,
  title,
  lead,
  action,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-ink-400 uppercase">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h2>
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
  const [page, summary, products] = await Promise.all([
    repo.listPublic({ limit: LANDING_POOL }),
    repo.publicSummary(),
    listPublicOfferings('product'),
  ]);

  const maps = await loadPublicMaps(repo);
  const techs = page.items.map((tech) => toPublicTech(tech, maps.labels, maps.domains));

  // 대표 데모는 순서가 가장 앞선 기술 중 재생할 영상이 있는 것으로 고른다.
  // 특정 기술 id 를 박아 두면 관리자가 순서를 바꿔도 히어로가 따라오지 않는다.
  const hero = techs.find((tech) => tech.media.video) ?? null;
  const featured = techs.slice(0, FEATURED_COUNT);

  return (
    <>
      <Hero tech={hero} />

      {/* 성과 요약 — 주장 바로 다음에 근거를 놓는다 */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <TrustBar summary={summary} tone="light" />
          <p className="mt-6 text-xs text-ink-400">{BRAND.proofLead}</p>
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
              eyebrow="Demo"
              title="바로 실행해 보실 수 있습니다"
              lead="샘플이 준비돼 있어 별도 자료 없이 그 자리에서 동작을 확인하실 수 있습니다."
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
            eyebrow="Domains"
            title="기술 영역"
            lead="여러 영역의 기술을 조합해 현장의 문제를 해결합니다."
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
            eyebrow="Applications"
            title="이미 현장에서 쓰이고 있습니다"
            lead="연구소의 기술이 실제로 들어가 있는 산업과 제품입니다."
          />

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col rounded-lg border border-ink-200 bg-white p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink-900">산업</h3>
                <span className="numeric text-sm text-ink-400">
                  {maps.industryList.length}개 분야
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                다음 산업 현장에 적용돼 있습니다.
              </p>
              <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                {maps.industryList.map((industry) => (
                  <Link
                    key={industry.id}
                    href={`/industries/${industry.id}`}
                    className="rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
                  >
                    {industry.label}
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <MoreLink href="/tech?view=industry">산업별로 보기</MoreLink>
              </div>
            </div>
            {products.length > 0 ? (
              <div className="flex flex-col rounded-lg border border-ink-200 bg-white p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink-900">제품</h3>
                  <span className="numeric text-sm text-ink-400">{products.length}개</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  다음 제품에 기술이 탑재돼 있습니다.
                </p>
                <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                  {products.map(({ offering }) => (
                    <Link
                      key={offering.id}
                      // 제품별 보기의 해당 위치로 직접 보낸다. 목록 상단에
                      // 떨어뜨리면 방문자가 찾던 제품을 다시 찾아야 한다.
                      href={`/tech?view=product#${offering.id}`}
                      className="rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-ink-500 hover:text-ink-900"
                    >
                      {offering.title}
                    </Link>
                  ))}
                </div>
                <div className="mt-6">
                  <MoreLink href="/tech?view=product">제품별로 보기</MoreLink>
                </div>
              </div>
            ) : null}
          </div>

          {/* 목록에 보이는 건수가 연구소가 가진 전부로 읽히지 않게 한다 */}
          <p className="mt-8 text-sm text-ink-500">{BRAND.scopeNote}</p>
        </section>
      </div>

      <ContactCta />
    </>
  );
}
