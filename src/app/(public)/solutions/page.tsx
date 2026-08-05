import type { Metadata } from 'next';
import Link from 'next/link';
import { OfferingSection } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '기술을 묶은 구성 제안',
  description: '요소기술을 묶어 현장 문제를 해결하는 구성 예시입니다.',
};

export default async function SolutionsPage() {
  const scenarios = await listPublicOfferings('scenario');

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-[var(--color-brand-bright)]">
            구성 제안
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            기술을 묶으면 현장의 문제가 풀립니다
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
            아직 제품으로 묶이지 않았지만 현장 조건에 맞춰 구성할 수 있는 조합입니다.
            바로 도입할 수 있는 단위를 찾으신다면{' '}
            <Link href="/products" className="text-white underline underline-offset-4">
              제품
            </Link>
            을 먼저 보세요.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {scenarios.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
            공개된 시나리오가 없습니다.
          </div>
        ) : (
          scenarios.map((item, index) => (
            <OfferingSection key={item.offering.id} item={item} index={index} />
          ))
        )}

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">
            현장 조건에 맞는 구성을 함께 설계해 드립니다
          </p>
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
