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
          <p className="text-sm font-medium tracking-wide text-ink-500 uppercase">구성</p>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            현장 구성
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
            아직 하나의 제품은 아니지만, 한 현장에서 함께 쓰이는 기술 조합입니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {scenarios.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white/5 px-6 py-16 text-center text-sm text-ink-500">
  공개된 구성이 아직 없습니다.
          </div>
        ) : (
          scenarios.map((item, index) => (
            <OfferingSection key={item.offering.id} item={item} index={index} />
          ))
        )}

        {/*
          도입 문의 배너는 두지 않는다 — 상시 진입은 GNB 버튼 하나로 충분하고,
          같은 화면에 같은 버튼이 두 벌 서면 덕지덕지 붙은 광고로 읽힌다.
        */}      </div>
    </>
  );
}
