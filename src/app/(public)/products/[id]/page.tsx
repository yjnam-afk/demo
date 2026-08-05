import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OfferingSection } from '@/components/site/OfferingSection';
import { BRAND } from '@/lib/brand';
import { listPublicOfferings } from '@/lib/data/offerings';

export const dynamic = 'force-dynamic';

async function findProduct(id: string) {
  // 목록과 같은 경로로 조회한다 — 비공개 기술 제외 규칙이 상세에서도 그대로 적용된다.
  const products = await listPublicOfferings('product');
  return products.find((item) => item.offering.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await findProduct(id);
  if (!found) return { title: '제품을 찾을 수 없습니다' };

  return { title: found.offering.title, description: found.offering.problem };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await findProduct(id);
  if (!found) notFound();

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <Link href="/products" className="text-sm text-ink-400 hover:text-white">
            ← 제품 목록
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {found.offering.title}
          </h1>
          {found.offering.name_en && found.offering.name_en !== found.offering.title ? (
            <p className="mt-1.5 text-sm text-ink-500">{found.offering.name_en}</p>
          ) : null}
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">
            {found.offering.summary}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <OfferingSection item={found} index={0} headingLevel="h3" />

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">
            {found.offering.title} 도입을 검토하고 계신가요?
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
            {BRAND.contact.promise}
          </p>
          <a
            href={`mailto:${BRAND.contact.email}?subject=${encodeURIComponent(
              `[도입 문의] ${found.offering.title}`,
            )}`}
            className="mt-5 inline-block rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.label}
          </a>
        </section>
      </div>
    </>
  );
}
