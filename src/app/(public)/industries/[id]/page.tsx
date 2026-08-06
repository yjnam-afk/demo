import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TechCard } from '@/components/tech/TechCard';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { listPublicOfferings } from '@/lib/data/offerings';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const industry = (await getRepo().listIndustries()).find((item) => item.id === id);
  if (!industry) return { title: '산업군을 찾을 수 없습니다' };

  return { title: industry.label, description: industry.description ?? BRAND.tagline };
}

/**
 * 산업별 화면.
 *
 * 새 데이터를 만들지 않는다 — 제품과 기술에 이미 붙어 있는 산업군 태그를
 * 뒤집어 조회해 조립한다. 산업군을 별도 엔티티로 두면 같은 정보를 세 군데서
 * 관리하게 되고, 한 곳만 고쳐지는 순간 화면이 서로 다른 말을 한다.
 */
export default async function IndustryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();

  const industries = await repo.listIndustries();
  const industry = industries.find((item) => item.id === id);
  if (!industry) notFound();

  const [products, scenarios, page] = await Promise.all([
    listPublicOfferings('product'),
    listPublicOfferings('scenario'),
    repo.listPublic({ industries: [id], limit: 60 }),
  ]);

  const maps = await loadPublicMaps(repo);
  const techs = page.items.map((tech) => toPublicTech(tech, maps.labels, maps.domains));
  const relatedProducts = products.filter((item) => item.offering.industries.includes(id));
  const relatedScenarios = scenarios.filter((item) => item.offering.industries.includes(id));

  const empty = relatedProducts.length === 0 && relatedScenarios.length === 0 && techs.length === 0;

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-sm font-medium tracking-wide text-[var(--color-brand-bright)]">
            산업군
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {industry.label}
          </h1>
          {industry.description ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
              {industry.description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm">
            <span className="text-ink-400">
              제품 <span className="numeric font-semibold text-white">{relatedProducts.length}</span>
            </span>
            <span className="text-ink-400">
              솔루션 구성{' '}
              <span className="numeric font-semibold text-white">{relatedScenarios.length}</span>
            </span>
            <span className="text-ink-400">
              기술 <span className="numeric font-semibold text-white">{techs.length}</span>
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {empty ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
            이 산업에 공개된 항목이 아직 없습니다.
          </div>
        ) : null}

        {relatedProducts.length > 0 ? (
          <section className="py-14">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">제품</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {relatedProducts.map(({ offering, steps }) => (
                <Link
                  key={offering.id}
                  href={`/products/${offering.id}`}
                  className="flex flex-col rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-ink-400"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-ink-900">{offering.title}</h3>
                    {offering.name_en && offering.name_en !== offering.title ? (
                      <span className="text-xs text-ink-400">{offering.name_en}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {offering.problem}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span>구성 기술 {steps.length}개</span>
                    {offering.release ? <span>· {RELEASE_STAGE_LABELS[offering.release]}</span> : null}
                    {offering.deployment?.length ? (
                      <span>
                        · {offering.deployment.map((d) => DEPLOYMENT_LABELS[d]).join(' / ')}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedScenarios.length > 0 ? (
          <section className="border-t border-ink-200 py-14">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">솔루션 구성</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {relatedScenarios.map(({ offering }) => (
                <Link
                  key={offering.id}
                  href="/solutions"
                  className="rounded border border-ink-300 bg-white px-4 py-2 text-sm text-ink-700 hover:border-ink-500"
                >
                  {offering.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {techs.length > 0 ? (
          <section className="border-t border-ink-200 py-14">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">기술</h2>
            <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {techs.map((tech) => (
                <TechCard key={tech.id} tech={tech} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">
            {industry.label} 현장에 맞는 구성을 제안해 드립니다
          </p>
          <Link
            href="/#contact"
            className="mt-5 inline-block rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.label}
          </Link>
        </section>
      </div>
    </>
  );
}
