import type { Metadata } from 'next';
import Link from 'next/link';
import { OfferingSection } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '제품',
  description: '제품별 구성 기술',
};

export default async function ProductsPage() {
  const products = await listPublicOfferings('product');

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <p className="text-sm font-medium tracking-wide text-ink-400 uppercase">제품</p>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            제품
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            각 제품이 어떤 기술로 구성되어 있는지 단계별로 정리했습니다.
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
