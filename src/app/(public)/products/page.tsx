import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductRow } from '@/components/site/ProductCard';
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
      {/*
        머리에 눈썹 문구를 두지 않는다. 이 화면은 고를 것이 없어서 눈썹에 넣을
        말이 제목과 같아지고("제품" 위에 "제품"), 그러면 자리만 차지한다.
      */}
      <section className="grid-backdrop border-b border-white/5 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">제품</h1>
            <span className="numeric text-sm text-ink-500">{products.length}개</span>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
            각 제품을 이루는 기술입니다. 단계별 구성과 성능은 제품별 화면에 있습니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {products.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white/5 px-6 py-16 text-center text-sm text-ink-500">
            공개된 제품이 없습니다.
          </div>
        ) : (
          /* 행 목록 — 요약을 자르지 않는다. 기술 목록과 같은 리듬이다. */
          <div className="py-6">
            {products.map((item) => (
              <ProductRow key={item.offering.id} item={item} />
            ))}
          </div>
        )}

        {/*
          도입 문의 배너는 두지 않는다 — 상시 진입은 GNB 버튼 하나로 충분하고,
          같은 화면에 같은 버튼이 두 벌 서면 덕지덕지 붙은 광고로 읽힌다.
        */}      </div>
    </>
  );
}
