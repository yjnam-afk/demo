import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { TechDetail } from '@/components/tech/TechDetail';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';

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
  if (!tech) {
    /**
     * id 가 바뀐 기술일 수 있다. 영업 담당이 메일로 보낸 링크나 전시회
     * 자료의 QR 이 옛 주소를 가리키고 있으므로, 404 로 끝내지 않고 현재
     * 주소로 넘긴다. 비공개로 돌린 기술은 여기서도 걸리지 않는다.
     */
    const moved = await repo.findByPreviousId(id);
    if (moved && (await repo.getPublic(moved.id))) permanentRedirect(`/tech/${moved.id}`);
    notFound();
  }

  // 함께 쓰는 기술도 같은 경로로 조회해, 비공개 기술이 링크로 새어 나가지 않게 한다.
  const maps = await loadPublicMaps(repo);

  const related = (await Promise.all(tech.related_tech.map((relatedId) => repo.getPublic(relatedId))))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => toPublicTech(item, maps.labels, maps.domains));

  // 이 기술을 구성으로 쓰는 제품 — 제품이 기술 id 를 참조하므로 뒤집어 조회만 하면 된다.
  // 기술 쪽에 제품 목록을 복사해 두지 않으므로 어긋날 일이 없다.
  const usedIn = (await repo.listSolutions({ publishedOnly: true, kind: 'product' }))
    .filter((product) => product.steps.some((step) => step.tech_id === tech.id))
    .map((product) => ({ id: product.id, title: product.title, name_en: product.name_en }));

  return <TechDetail tech={toPublicTech(tech, maps.labels, maps.domains)} related={related} usedIn={usedIn} />;
}
