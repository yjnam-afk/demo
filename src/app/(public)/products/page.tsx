import type { Metadata } from 'next';
import Link from 'next/link';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';
import { DEPLOYMENT_LABELS, RELEASE_STAGE_LABELS } from '@/lib/domain/enums';
import { accentStyle, cn } from '@/lib/ui/domain';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '제품',
  description: '제품별 구성 기술',
};

/**
 * 제품 한 줄.
 *
 * 목록에는 어떤 제품이 있고 무엇으로 이루어져 있는지까지만 둔다. 전에는 이
 * 화면이 제품마다 문제 설명과 단계별 구성, 지표까지 전부 펼쳐 놓았는데,
 * 그러면 아래에 있는 제품 상세 화면이 목록의 복사본이 되어 눌러 볼 이유가
 * 없어진다. 같은 기술이 여러 제품에 들어가는 탓에 같은 수치가 화면에서
 * 서너 번 반복되기도 했다.
 *
 * 구성 기술을 제품 설명보다 앞에 세우지는 않되(제품이 무엇인지 모르면 기술
 * 이름도 읽히지 않는다) 이 목록에서 유일하게 밀도가 있는 자리로 둔다.
 * 제품 소개 자체는 공식 사이트가 맡는다.
 */
function ProductRow({ item }: { item: ResolvedOffering }) {
  const { offering, steps, industryLabels } = item;

  return (
    <li className="border-t border-ink-200 py-7 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">
          <Link href={`/products/${offering.id}`} className="hover:underline">
            {offering.title}
          </Link>
        </h2>
        {offering.name_en && offering.name_en !== offering.title ? (
          <span className="text-sm text-ink-400">{offering.name_en}</span>
        ) : null}
        {offering.release ? (
          <span className="rounded border border-ink-300 bg-white px-2 py-0.5 text-xs text-ink-600">
            {RELEASE_STAGE_LABELS[offering.release]}
          </span>
        ) : null}
        {offering.deployment?.map((deployment) => (
          <span
            key={deployment}
            className="rounded border border-ink-300 bg-white px-2 py-0.5 text-xs text-ink-600"
          >
            {DEPLOYMENT_LABELS[deployment]}
          </span>
        ))}
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600">{offering.summary}</p>

      {steps.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">구성 기술</span>
          {steps.map(({ tech }) => (
            <Link
              key={tech.id}
              href={`/tech/${tech.id}`}
              className="flex items-center gap-1.5 rounded border border-ink-300 bg-white px-2.5 py-1 text-sm text-ink-800 transition-colors hover:border-ink-500"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', accentStyle(tech.domain_accent).dot)} />
              {tech.name_ko}
            </Link>
          ))}
        </div>
      ) : null}

      {industryLabels.length > 0 ? (
        <p className="mt-3 text-xs text-ink-500">
          대상 · {industryLabels.map((industry) => industry.label).join(', ')}
        </p>
      ) : null}
    </li>
  );
}

export default async function ProductsPage() {
  const products = await listPublicOfferings('product');

  return (
    <>
      {/*
        머리에 눈썹 문구를 두지 않는다. 이 화면은 고를 것이 없어서 눈썹에 넣을
        말이 제목과 같아지고("제품" 위에 "제품"), 그러면 자리만 차지한다.
      */}
      <section className="grid-backdrop border-b border-white/5 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">제품</h1>
            <span className="numeric text-sm text-ink-400">{products.length}개</span>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            각 제품을 이루는 기술입니다. 단계별 구성과 성능은 제품별 화면에 있습니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {products.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
            공개된 제품이 없습니다.
          </div>
        ) : (
          <ul className="pt-10">
            {products.map((item) => (
              <ProductRow key={item.offering.id} item={item} />
            ))}
          </ul>
        )}

        <section className="my-16 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">도입 조건을 함께 검토해 드립니다</p>
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
