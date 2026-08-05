import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TechDetail } from '@/components/tech/TechDetail';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';

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
  const related = (await Promise.all(tech.related_tech.map((relatedId) => repo.getPublic(relatedId))))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(toPublicTech);

  return <TechDetail tech={toPublicTech(tech)} related={related} />;
}
