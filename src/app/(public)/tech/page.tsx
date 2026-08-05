import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { IndustryGroup, OfferingGroup } from '@/components/tech/CatalogGroups';
import { TechGrid } from '@/components/tech/TechGrid';
import {
  VIEW_HINTS,
  VIEW_TITLES,
  isCatalogView,
  type CatalogView,
} from '@/components/tech/catalogView';
import { DomainPillars } from '@/components/site/DomainPillars';
import { TrustBar } from '@/components/site/TrustBar';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';
import type { Domain } from '@/lib/domain/enums';
import { PAGE_SIZE, parseTechQuery, toSearchParams } from '@/lib/ui/query';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '기술 카탈로그',
  description: BRAND.tagline,
};

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
      {label}
    </div>
  );
}

export default async function TechCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = toSearchParams(raw);

  // 기본은 제품별이다 — 방문자는 사업 의사결정자이고, 먼저 알고 싶은 것은
  // "무엇을 도입할 수 있는가"이지 "어떤 기술이 있는가"가 아니다.
  const viewParam = params.get('view');
  const view: CatalogView = isCatalogView(viewParam) ? viewParam : 'product';

  const query = { ...parseTechQuery(params), offset: 0, limit: PAGE_SIZE };
  const selectedDomain = (query.domain ?? null) as Domain | null;

  const repo = getRepo();
  const [page, facets, summary, industries] = await Promise.all([
    repo.listPublic(query),
    repo.publicFacets(),
    repo.publicSummary(),
    repo.listIndustries(),
  ]);
  const maps = await loadPublicMaps(repo);

  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  // 축이 선택되면 히어로 문구를 그 축의 것으로 바꾼다. 축 정의가 데이터라
  // 문구도 마스터에서 가져온다.
  const narrative = selectedDomain ? (maps.domains.get(selectedDomain) ?? null) : null;

  /**
   * 보기 기준별 본문.
   *
   * 세 기준은 같은 자료를 다르게 묶어 보여줄 뿐이라 한 화면 안에서 갈린다.
   * 화면을 따로 두면 방문자가 "제품 화면에는 없고 기술 화면에는 있는 것"을
   * 의심하게 된다.
   */
  let body: React.ReactNode;
  // 보기마다 세는 대상이 다르다. 제품별 보기에서 "기술 N건"은 무엇을 센 것인지 모른다.
  let countLabel: string;

  if (view === 'tech') {
    countLabel = `${page.total}건`;
    body = (
      <>
        {/*
          3축은 기술의 분류다. 제품은 3축으로 나뉘지 않고 산업별 보기에서는
          산업군이 이미 분류 역할을 하므로, 이 블록은 기술별 보기에만 둔다.
        */}
        <div className="mb-6">
          <DomainPillars
            domains={maps.domainList}
            counts={summary.domainCounts}
            selected={selectedDomain}
          />
        </div>
        <CatalogFilters facets={facets} params={params} />
        <div className="mt-6">
          <TechGrid
            initialItems={page.items.map((tech) => toPublicTech(tech, maps.labels, maps.domains))}
            total={page.total}
            hasMore={page.hasMore}
            query={carriedQuery.toString()}
          />
        </div>
      </>
    );
  } else if (view === 'product') {
    const [products, scenarios] = await Promise.all([
      listPublicOfferings('product'),
      listPublicOfferings('scenario'),
    ]);
    countLabel = `제품 ${products.length} · 솔루션 구성 ${scenarios.length}`;

    body =
      products.length === 0 && scenarios.length === 0 ? (
        <Empty label="공개된 제품이 아직 없습니다." />
      ) : (
        <div>
          {products.map((item) => (
            <OfferingGroup key={item.offering.id} item={item} />
          ))}

          {scenarios.length > 0 ? (
            <div className="mt-12 border-t border-ink-300 pt-10">
              <h2 className="text-lg font-semibold text-ink-900">솔루션 구성</h2>
              <p className="mt-1 mb-2 text-sm text-ink-500">
                한 현장에서 함께 쓰이는 기술 조합입니다.
              </p>
              {scenarios.map((item) => (
                <OfferingGroup key={item.offering.id} item={item} />
              ))}
            </div>
          ) : null}
        </div>
      );
  } else {
    const [products, all] = await Promise.all([
      listPublicOfferings('product'),
      repo.listPublic({ limit: 200 }),
    ]);

    const groups = industries
      .map((industry) => ({
        industry,
        products: products.filter((item) => item.offering.industries.includes(industry.id)),
        // 산업 판정은 id 를 들고 있는 원본으로 하고, 카드에는 라벨이 붙은 형태를 넘긴다.
        techs: all.items
          .filter((tech) => tech.industries.includes(industry.id))
          .map((tech) => toPublicTech(tech, maps.labels, maps.domains)),
      }))
      // 항목이 하나도 없는 산업군은 감춘다 — 빈 칸이 늘어나면 목록이 못 미덥게 읽힌다.
      .filter((group) => group.products.length > 0 || group.techs.length > 0);

    countLabel = `${groups.length}개 산업`;

    body =
      groups.length === 0 ? (
        <Empty label="공개된 항목이 아직 없습니다." />
      ) : (
        <div>
          {groups.map((group) => (
            <IndustryGroup key={group.industry.id} {...group} />
          ))}
        </div>
      );
  }

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p
            className={
              narrative
                ? 'text-sm font-medium tracking-wide text-ink-400 uppercase'
                : 'text-sm font-medium tracking-wide text-[var(--color-brand-bright)]'
            }
          >
            {narrative ? narrative.label : BRAND.slogan}
          </p>
          <h1 className="headline mt-4 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
            {narrative ? narrative.lead : BRAND.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
            {narrative ? narrative.description : BRAND.intro}
          </p>

          <div className="mt-10 border-t border-white/10 pt-8">
            <TrustBar summary={summary} />
            <p className="mt-6 text-xs text-ink-500">{BRAND.proofLead}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="pt-12 pb-20">
          {/* 전환은 GNB 가 맡는다. 여기서는 지금 무엇을 보고 있는지만 밝힌다. */}
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-200 pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink-900">
                {VIEW_TITLES[view]}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{VIEW_HINTS[view]}</p>
            </div>
            <p className="numeric text-sm text-ink-500">{countLabel}</p>
          </div>
          {body}
        </section>
      </div>
    </>
  );
}
