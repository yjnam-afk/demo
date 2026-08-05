import type { TechRepository } from '@/lib/data/repository';
import type { DomainDef, Industry } from './types';
import { domainMap, industryLabelMap } from './publicView';

/**
 * 공개 화면이 기술을 직렬화하기 전에 필요한 조회표.
 *
 * 산업군과 대분류는 id 로 저장하고 화면에는 라벨로 내보낸다. 화면마다
 * 마스터를 따로 읽으면 toPublicTech 호출부가 하나씩 인자를 빠뜨리기 쉽고,
 * 그러면 그 화면에서만 "digital_twin" 같은 id 가 그대로 노출된다.
 * 두 마스터를 한 번에 읽어 함께 넘기게 해 빠뜨릴 여지를 없앤다.
 */
export interface PublicMaps {
  labels: Map<string, string>;
  domains: Map<string, DomainDef>;
  /** 축 카드처럼 목록 자체가 필요한 화면용 */
  domainList: DomainDef[];
  industryList: Industry[];
}

export async function loadPublicMaps(repo: TechRepository): Promise<PublicMaps> {
  const [industries, domains] = await Promise.all([repo.listIndustries(), repo.listDomains()]);
  return {
    labels: industryLabelMap(industries),
    domains: domainMap(domains),
    domainList: domains,
    industryList: industries,
  };
}
