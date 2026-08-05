import type { Demo, DomainDef, Industry, PublicDemo, PublicTech, Solution, Tech } from './types';
import { FALLBACK_ACCENT } from '@/lib/ui/domain';

/**
 * 내부망 엔드포인트를 공개 데모 정보로 변환한다.
 * api / embed 타입의 주소는 통째로 사라지며, 클라이언트는 기술 id 만 가지고
 * 우리 서버의 프록시 라우트를 호출한다.
 */
function toPublicDemo(demo: Demo): PublicDemo {
  switch (demo.type) {
    case 'api':
      return { type: 'api', input_kind: demo.input_kind, samples: demo.samples };
    case 'embed':
      // embed_url 과 chromeless_params 는 서버의 리버스 프록시만 사용한다.
      return { type: 'embed' };
    case 'video':
      return { type: 'video', src: demo.src, src_webm: demo.src_webm, poster: demo.poster };
    case 'metric':
      return { type: 'metric', highlight_metric: demo.highlight_metric };
  }
}

/**
 * 외부 공개 뷰로 내보낼 형태로 변환한다.
 *
 * 제거 대상:
 *  - demo.endpoint / demo.api_name / demo.embed_url (내부망 주소)
 *  - metrics[].dataset_url (평가 데이터 원본 링크)
 *  - resources 중 internal: true (내부 문서)
 *  - health, visibility (운영 정보)
 *
 * 이 함수는 서버 컴포넌트에서 클라이언트로 데이터를 넘기기 직전에 호출한다.
 * 공개 라우트가 Tech 를 그대로 직렬화하면 내부 주소가 RSC 페이로드에 실린다.
 */
export function toPublicTech(
  tech: Tech,
  industryLabels?: Map<string, string>,
  domains?: Map<string, DomainDef>,
): PublicTech {
  const { demo, metrics, resources, health, visibility, ...rest } = tech;
  void health;
  void visibility;

  // 축이 삭제된 뒤 남은 기술도 화면에서 사라지면 안 된다. 라벨은 id 로
  // 대신하고 색만 기본값으로 떨어뜨려 목록에는 그대로 남긴다.
  const def = domains?.get(tech.domain);

  return {
    ...rest,
    domain_label: def?.label ?? tech.domain,
    domain_short: def?.short_label ?? def?.label ?? tech.domain,
    domain_accent: def?.accent ?? FALLBACK_ACCENT,
    // 산업군은 id 로 저장하고 화면에는 라벨로 내보낸다. 컴포넌트마다 마스터를
    // 다시 조회하면 같은 변환이 흩어지므로 이 경계에서 한 번만 바꾼다.
    industries: industryLabels
      ? rest.industries.map((id) => industryLabels.get(id) ?? id)
      : rest.industries,
    demo: toPublicDemo(demo),
    metrics: metrics.map(({ dataset_url, ...metric }) => {
      void dataset_url;
      return metric;
    }),
    resources: resources.filter((r) => !r.internal),
  };
}

/** 외부 공개 대상인지 판정한다. 발행 상태와 외부 노출 설정을 모두 만족해야 한다. */
export function isExternallyVisible(tech: Tech): boolean {
  return tech.status === 'published' && tech.visibility.external;
}

export function isSolutionVisible(solution: Solution): boolean {
  return solution.status === 'published';
}

/** 산업군 id → 라벨 조회표. 공개 화면으로 넘기기 전에 한 번 만들어 재사용한다. */
export function industryLabelMap(industries: Industry[]): Map<string, string> {
  return new Map(industries.map((industry) => [industry.id, industry.label]));
}

/** 대분류 id → 정의 조회표. */
export function domainMap(domains: DomainDef[]): Map<string, DomainDef> {
  return new Map(domains.map((domain) => [domain.id, domain]));
}
