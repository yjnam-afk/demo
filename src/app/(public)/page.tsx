import Link from 'next/link';
import { ContactCta } from '@/components/site/ContactCta';
import { Hero } from '@/components/site/Hero';
import { TrustBar } from '@/components/site/TrustBar';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { TechGrid } from '@/components/tech/TechGrid';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';
import { PAGE_SIZE, parseTechQuery, toSearchParams } from '@/lib/ui/query';

/**
 * 메인이 곧 카탈로그다.
 *
 * 전에는 랜딩과 카탈로그가 따로 있었는데, 랜딩의 대표 기술은 카탈로그의
 * 상위 네 건이었고 기술 영역 카드는 카탈로그의 축 탭이었고 적용 현장 칩은
 * 산업군 필터였다 — 같은 이야기를 두 페이지가 나눠 하니 어디를 다듬어도
 * 반대쪽에 중복이 남았다. 방문자(전시 QR·영업 링크로 온 의사결정자)가
 * 원하는 것은 소개가 아니라 증거이므로, 첫 화면이 곧 기술 목록이다.
 *
 * 매 요청 저장소를 읽는다. 정적 프리렌더로 두면 관리자가 발행해도 빌드
 * 전까지 화면이 바뀌지 않는다.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = toSearchParams(raw);
  const query = { ...parseTechQuery(params), offset: 0, limit: PAGE_SIZE };

  const repo = getRepo();
  const [page, facets, summary, products] = await Promise.all([
    repo.listPublic(query),
    // 칩 숫자가 현재 필터 상태를 반영하도록 같은 질의를 넘긴다.
    repo.publicFacets(query),
    repo.publicSummary(),
    listPublicOfferings('product'),
  ]);
  const maps = await loadPublicMaps(repo);

  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  return (
    <>
      <Hero />

      {/* 성과 요약 — 주장 바로 다음에 근거를 놓는다 */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <TrustBar summary={summary} />
        </div>
      </section>

      {/* 카탈로그 본문 — 이 사이트의 몸통 */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <CatalogFilters facets={facets} params={params} />
        <div className="mt-6">
          {/*
            key 가 필터 상태다. 목록은 "더보기" 누적을 위해 상태를 들고
            있어서, 필터가 바뀌어도 같은 자리의 컴포넌트면 이전 목록이
            그대로 남는다 — 필터가 바뀌면 새로 세운다.
          */}
          <TechGrid
            key={carriedQuery.toString()}
            initialItems={page.items.map((tech) => toPublicTech(tech, maps.labels, maps.domains))}
            total={page.total}
            hasMore={page.hasMore}
            query={carriedQuery.toString()}
          />
        </div>

        {/*
          제품 — 기술을 담아 파는 단위. 목록을 다 본 다음에 오는 부록이다.
          제품에서 시작하는 이야기는 회사 공식 사이트가 맡는다.
        */}
        {products.length > 0 ? (
          <section className="mt-16 border-t border-ink-200 pt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">
                이 기술들이 들어간 제품
              </h2>
              <Link
                href="/products"
                className="border-b border-ink-300 pb-0.5 text-sm text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
              >
                제품 보기 →
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
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
          </section>
        ) : null}
      </div>

      <ContactCta />
    </>
  );
}
