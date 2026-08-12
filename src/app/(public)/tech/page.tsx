import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { TechGrid } from '@/components/tech/TechGrid';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';
import type { Domain } from '@/lib/domain/enums';
import { PAGE_SIZE, parseTechQuery, toSearchParams } from '@/lib/ui/query';

export const dynamic = 'force-dynamic';

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
  const [page, facets] = await Promise.all([
    repo.listPublic(query),
    // 칩 숫자가 현재 필터 상태를 반영하도록 같은 질의를 넘긴다.
    repo.publicFacets(query),
  ]);
  const maps = await loadPublicMaps(repo);

  const carriedQuery = new URLSearchParams(params);
  carriedQuery.delete('offset');

  // 축이 선택되면 히어로 문구를 그 축의 것으로 바꾼다. 축 정의가 데이터라
  // 문구도 마스터에서 가져온다.
  const narrative = selectedDomain ? (maps.domains.get(selectedDomain) ?? null) : null;

  const body = (
    <>
      {/*
        대분류 선택은 필터 바의 탭 하나로만 한다. 전에는 위에 축 카드
        (DomainPillars)가 한 벌 더 있었는데, 같은 것을 고르는 조작이 두 벌
        서면 방문자는 둘의 차이를 찾으려 든다. 축 카드는 랜딩의 소개용이다.
      */}
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
    </>
  );

  return (
    <>
      {/*
        카탈로그 머리는 랜딩 히어로가 아니다.
        같은 슬로건과 같은 헤드라인을 그대로 반복하면 두 화면이 구분되지 않고,
        방문자는 링크를 눌러도 제자리인 것처럼 느낀다. 여기서는 지금 무엇을
        보고 있는지만 밝히고 크기도 히어로보다 낮춘다.
      */}
      <section className="grid-backdrop border-b border-white/5 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          {/*
            눈썹 자리는 늘 "지금 보고 있는 것" 의 이름이다. 전에는 AI 축에만
            회사 슬로건을 세웠는데, 다른 축은 이름이 나오는 자리에 AI 만
            광고 문구가 서는 셈이라 특례를 없앤다.
          */}
          <p className="text-sm font-medium tracking-wide text-ink-400 uppercase">
            {narrative?.label ?? '기술'}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {narrative ? narrative.lead : '기술 카탈로그'}
            </h1>
            {/* 규모는 제목 옆에 붙인다. 본문 위에 홀로 두면 무엇을 센 값인지 읽히지 않는다. */}
            <span className="numeric text-sm text-ink-400">{page.total}건</span>
          </div>
          {narrative ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
              {narrative.description}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="pt-10 pb-20">
          {body}

        </section>
      </div>
    </>
  );
}
