import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { TechGrid } from '@/components/tech/TechGrid';
import { DomainPillars } from '@/components/site/DomainPillars';
import { TrustBar } from '@/components/site/TrustBar';
import { BRAND, DOMAIN_NARRATIVE } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { industryLabelMap, toPublicTech } from '@/lib/domain/publicView';
import type { Domain } from '@/lib/domain/enums';
import { PAGE_SIZE, parseTechQuery, toSearchParams } from '@/lib/ui/query';

export const metadata: Metadata = {
  title: '기술 카탈로그',
  description: BRAND.tagline,
};

export default async function TechCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = toSearchParams(raw);
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

  // "더보기"가 이어받을 필터 상태. offset 은 클라이언트가 다시 채운다.
  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  const narrative = selectedDomain ? DOMAIN_NARRATIVE[selectedDomain] : null;

  return (
    <>
      {/*
        도입부 — 카드 그리드보다 먼저 온다.
        방문자는 기술 담당자가 아니라 사업 의사결정자이므로, 목록을 훑기 전에
        "무엇을 하는 조직이고 믿을 만한 규모인가"를 먼저 읽어야 한다.
      */}
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
        {/* 3축 소개 — 필터이자 회사 서사. 축이 선택되면 그 축만 강조된다. */}
        <section className="-mt-8 pb-12">
          <DomainPillars counts={summary.domainCounts} selected={selectedDomain} />
        </section>

        <section className="pb-16">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">
              {narrative ? `${narrative.title} 기술` : '전체 기술'}
            </h2>
            <p className="numeric text-sm text-ink-500">{page.total}건</p>
          </div>

          <CatalogFilters facets={facets} params={params} />

          <div className="mt-6">
            <TechGrid
              initialItems={page.items.map((tech) => toPublicTech(tech, labels))}
              total={page.total}
              hasMore={page.hasMore}
              query={carriedQuery.toString()}
            />
          </div>
        </section>
      </div>
    </>
  );
}
