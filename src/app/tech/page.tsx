import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { TechGrid } from '@/components/tech/TechGrid';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import { PAGE_SIZE, parseTechQuery, toSearchParams } from '@/lib/ui/query';

export const metadata: Metadata = {
  title: '기술 카탈로그',
  description: 'AI 요소기술, 디지털 트윈, 공간 분석 기술을 검증 지표와 함께 확인합니다.',
};

export default async function TechCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = toSearchParams(raw);
  const query = { ...parseTechQuery(params), offset: 0, limit: PAGE_SIZE };

  const repo = getRepo();
  const [page, facets] = await Promise.all([repo.listPublic(query), repo.publicFacets()]);

  // "더보기"가 이어받을 필터 상태. offset 은 클라이언트가 다시 채운다.
  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">기술 카탈로그</h1>
        <p className="mt-2 text-sm text-ink-500">
          각 기술은 해결하는 문제와 검증된 성능 지표로 확인할 수 있습니다.
        </p>
      </header>

      <CatalogFilters facets={facets} params={params} />

      <div className="mt-6">
        <TechGrid
          initialItems={page.items.map(toPublicTech)}
          total={page.total}
          hasMore={page.hasMore}
          query={carriedQuery.toString()}
        />
      </div>
    </div>
  );
}
