import Link from 'next/link';
import { ContactCta } from '@/components/site/ContactCta';
import { DomainPillars } from '@/components/site/DomainPillars';
import { Hero } from '@/components/site/Hero';
import { TrustBar } from '@/components/site/TrustBar';
import { TechCard } from '@/components/tech/TechCard';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';

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
  const [page, summary] = await Promise.all([
    repo.listPublic({ limit: LANDING_POOL }),
    repo.publicSummary(),
  ]);

  const techs = page.items.map(toPublicTech);

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
        <section className="py-16">
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
