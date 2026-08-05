import 'server-only';
import { getRepo } from '@/lib/data';
import { industryLabelMap, toPublicTech } from '@/lib/domain/publicView';
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
 * 구성 기술이 하나도 남지 않은 묶음은 보여줄 내용이 없어 제외한다.
 */
export async function listPublicOfferings(kind: OfferingKind): Promise<ResolvedOffering[]> {
  const repo = getRepo();
  const [offerings, industries] = await Promise.all([
    repo.listSolutions({ publishedOnly: true, kind }),
    repo.listIndustries(),
  ]);

  const labels = industryLabelMap(industries);

  const resolved = await Promise.all(
    offerings.map(async (offering) => {
      const steps = await Promise.all(
        offering.steps.map(async (step) => {
          const tech = await repo.getPublic(step.tech_id);
          return tech ? { role: step.role, tech: toPublicTech(tech, labels) } : null;
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

  return resolved.filter((item) => item.steps.length > 0);
}
