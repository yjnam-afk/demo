import type { Metadata } from 'next';
import Link from 'next/link';
import { OfferingSection } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '제품',
  description: '현장에 바로 적용할 수 있는 제품과 그 구성 기술을 공개합니다.',
};

export default async function ProductsPage() {
  const products = await listPublicOfferings('product');

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-[var(--color-brand-bright)]">제품</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            현장에 바로 들어가는 단위
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
            각 제품이 어떤 기술로 이루어져 있는지, 그 기술의 성능이 어떻게 검증되었는지
            그대로 공개합니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {products.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
            공개된 제품이 없습니다.
          </div>
        ) : (
          products.map((item, index) => (
            <OfferingSection key={item.offering.id} item={item} index={index} linkToDetail />
          ))
        )}

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">도입 조건을 함께 검토해 드립니다</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
            {BRAND.contact.promise}
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
