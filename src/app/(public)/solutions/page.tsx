import type { Metadata } from 'next';
import Link from 'next/link';
import { OfferingSection } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '현장 구성',
  description: '한 현장에서 함께 쓰이는 기술 조합',
};

export default async function SolutionsPage() {
  const scenarios = await listPublicOfferings('scenario');

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <p className="text-sm font-medium tracking-wide text-ink-400 uppercase">구성</p>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            현장 구성
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            아직 제품으로 묶지는 않았지만 한 현장에서 같이 쓰이는 조합입니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {scenarios.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
  공개된 구성이 아직 없습니다.
          </div>
        ) : (
          scenarios.map((item, index) => (
            <OfferingSection key={item.offering.id} item={item} index={index} />
          ))
        )}

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">
현장에 맞는 구성을 설계해 드립니다
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
