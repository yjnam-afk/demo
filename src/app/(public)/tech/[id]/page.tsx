import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TechDetail } from '@/components/tech/TechDetail';
import { getRepo } from '@/lib/data';
import { industryLabelMap, toPublicTech } from '@/lib/domain/publicView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tech = await getRepo().getPublic(id);
  if (!tech) return { title: '기술을 찾을 수 없습니다' };

  return {
    title: tech.name_ko,
    description: tech.business.problem ?? tech.summary,
  };
}

export default async function TechDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();

  // getPublic 은 비공개·임시저장 기술에 null 을 돌려준다 —
  // 외부 방문자에게는 존재 자체가 드러나지 않는다.
  const tech = await repo.getPublic(id);
  if (!tech) notFound();

  // 함께 쓰는 기술도 같은 경로로 조회해, 비공개 기술이 링크로 새어 나가지 않게 한다.
  const labels = industryLabelMap(await repo.listIndustries());

  const related = (await Promise.all(tech.related_tech.map((relatedId) => repo.getPublic(relatedId))))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => toPublicTech(item, labels));

  // 이 기술을 구성으로 쓰는 제품 — 제품이 기술 id 를 참조하므로 뒤집어 조회만 하면 된다.
  // 기술 쪽에 제품 목록을 복사해 두지 않으므로 어긋날 일이 없다.
  const usedIn = (await repo.listSolutions({ publishedOnly: true, kind: 'product' }))
    .filter((product) => product.steps.some((step) => step.tech_id === tech.id))
    .map((product) => ({ id: product.id, title: product.title, name_en: product.name_en }));

  return <TechDetail tech={toPublicTech(tech, labels)} related={related} usedIn={usedIn} />;
}
