import 'server-only';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import { loadPublicMaps } from '@/lib/domain/publicMaps';
import type { ResolvedOffering } from '@/components/site/OfferingSection';
import type { OfferingKind } from '@/lib/domain/enums';
import type { ResolvedStep } from '@/components/site/OfferingSection';

/**
 * 공개용 묶음 조회.
 *
 * 구성 기술을 공개 조회로 채우기 때문에, 비공개·임시저장 기술을 참조하고 있어도
 * 그 항목만 빠진다. 묶음 쪽에 기술 정보를 복사해 두지 않아서 가능한 처리이고,
 * 이렇게 해야 기술 하나를 비공개로 돌렸을 때 제품·시나리오를 통해 새어 나가지 않는다.
 *
 * 구성 기술이 남지 않았을 때의 처리는 종류마다 다르다. 시나리오는 조합이 곧
 * 내용이라 제외하지만, 제품은 구성이 비어도 그 자체로 소개할 값이 있다.
 */
export async function listPublicOfferings(kind: OfferingKind): Promise<ResolvedOffering[]> {
  const repo = getRepo();
  const [offerings, maps] = await Promise.all([
    repo.listSolutions({ publishedOnly: true, kind }),
    // 산업군만 읽으면 카드의 대분류 라벨이 비어 원본 id 가 그대로 노출된다.
    // 두 마스터를 함께 넘긴다.
    loadPublicMaps(repo),
  ]);

  const labels = maps.labels;

  const resolved = await Promise.all(
    offerings.map(async (offering) => {
      const steps = await Promise.all(
        offering.steps.map(async (step) => {
          const tech = await repo.getPublic(step.tech_id);
          return tech ? { role: step.role, tech: toPublicTech(tech, maps.labels, maps.domains) } : null;
        }),
      );

      return {
        offering,
        steps: steps.filter((step): step is ResolvedStep => step !== null),
        industryLabels: offering.industries
          .filter((id) => labels.has(id))
          .map((id) => ({ id, label: labels.get(id) as string })),
      };
    }),
  );

  return resolved.filter((item) => item.offering.kind === 'product' || item.steps.length > 0);
}
