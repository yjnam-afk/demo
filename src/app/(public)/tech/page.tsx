import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { IndustryGroup, OfferingGroup } from '@/components/tech/CatalogGroups';
import { TechGrid } from '@/components/tech/TechGrid';
import {
  VIEW_LABELS,
  ViewSwitcher,
  isCatalogView,
  type CatalogView,
} from '@/components/tech/ViewSwitcher';
import { DomainPillars } from '@/components/site/DomainPillars';
import { TrustBar } from '@/components/site/TrustBar';
import { BRAND, DOMAIN_NARRATIVE } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { industryLabelMap, toPublicTech } from '@/lib/domain/publicView';
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
      {label} 보기에 표시할 항목이 없습니다.
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
  const labels = industryLabelMap(industries);

  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  const narrative = selectedDomain ? DOMAIN_NARRATIVE[selectedDomain] : null;

  /**
   * 보기 기준별 본문.
   *
   * 세 기준은 같은 자료를 다르게 묶어 보여줄 뿐이라 한 화면 안에서 갈린다.
   * 화면을 따로 두면 방문자가 "제품 화면에는 없고 기술 화면에는 있는 것"을
   * 의심하게 된다.
   */
  let body: React.ReactNode;

  if (view === 'tech') {
    body = (
      <>
        <CatalogFilters facets={facets} params={params} />
        <div className="mt-6">
          <TechGrid
            initialItems={page.items.map((tech) => toPublicTech(tech, labels))}
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

    body =
      products.length === 0 && scenarios.length === 0 ? (
        <Empty label={VIEW_LABELS.product} />
      ) : (
        <div>
          {products.map((item) => (
            <OfferingGroup key={item.offering.id} item={item} />
          ))}

          {scenarios.length > 0 ? (
            <div className="mt-12 border-t border-ink-300 pt-10">
              <h2 className="text-lg font-semibold text-ink-900">기술을 묶은 구성 제안</h2>
              <p className="mt-1 mb-2 text-sm text-ink-500">
                아직 하나의 제품으로 묶이지 않았지만, 기술 몇 개를 조합하면 바로 현장에
                적용할 수 있는 구성입니다.
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
          .map((tech) => toPublicTech(tech, labels)),
      }))
      // 항목이 하나도 없는 산업군은 감춘다 — 빈 칸이 늘어나면 목록이 못 미덥게 읽힌다.
      .filter((group) => group.products.length > 0 || group.techs.length > 0);

    body =
      groups.length === 0 ? (
        <Empty label={VIEW_LABELS.industry} />
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
            {narrative ? narrative.title : BRAND.slogan}
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
        <section className="-mt-8 pb-12">
          <DomainPillars counts={summary.domainCounts} selected={selectedDomain} />
        </section>

        <section className="pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <ViewSwitcher current={view} params={params} />
            <p className="numeric text-sm text-ink-500">기술 {page.total}건</p>
          </div>
          {body}
        </section>
      </div>
    </>
  );
}
