import type { Metadata } from 'next';
import { CatalogFilters } from '@/components/tech/CatalogFilters';
import { IndustryGroup } from '@/components/tech/CatalogGroups';
import { GroupJumpBar } from '@/components/tech/GroupJumpBar';
import { TechGrid } from '@/components/tech/TechGrid';
import {
  DEFAULT_VIEW,
  VIEW_EYEBROWS,
  VIEW_TITLES,
  isCatalogView,
  type CatalogView,
} from '@/components/tech/catalogView';
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

  // 기본은 기술이다. 세 기준 모두 같은 기술 목록을 묶는 방식이지만,
  // 이 사이트가 소개하는 대상은 기술이고 제품·산업은 보조 기준이다.
  const viewParam = params.get('view');
  const view: CatalogView = isCatalogView(viewParam) ? viewParam : DEFAULT_VIEW;

  const query = { ...parseTechQuery(params), offset: 0, limit: PAGE_SIZE };
  const selectedDomain = (query.domain ?? null) as Domain | null;

  const repo = getRepo();
  const [page, facets, industries] = await Promise.all([
    repo.listPublic(query),
    // 칩 숫자가 현재 필터 상태를 반영하도록 같은 질의를 넘긴다.
    repo.publicFacets(query),
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

    const shown = new Set(groups.flatMap((group) => group.techs.map((tech) => tech.id)));
    countLabel = `기술 ${shown.size}건 · ${groups.length}개 산업`;

    body =
      groups.length === 0 ? (
        <Empty label="공개된 항목이 아직 없습니다." />
      ) : (
        <div>
          <GroupJumpBar
            items={groups.map((group) => ({
              id: group.industry.id,
              label: group.industry.label,
              count: group.techs.length,
            }))}
          />

          {groups.map((group) => (
            <IndustryGroup key={group.industry.id} {...group} />
          ))}
        </div>
      );
  }

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
            {narrative?.label ?? VIEW_EYEBROWS[view]}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {narrative ? narrative.lead : VIEW_TITLES[view]}
            </h1>
            {/* 규모는 제목 옆에 붙인다. 본문 위에 홀로 두면 무엇을 센 값인지 읽히지 않는다. */}
            <span className="numeric text-sm text-ink-400">{countLabel}</span>
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
