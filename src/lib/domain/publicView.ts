import type { Demo, DomainDef, Industry, PublicDemo, PublicTech, Solution, Tech } from './types';
import { FALLBACK_ACCENT } from '@/lib/ui/domain';
import { isListed, isReachableByLink } from './enums';

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
  /**
   * 두 조회표는 선택 인자가 아니다.
   *
   * 선택으로 두었더니 호출부 한 곳이 대분류를 빠뜨려도 컴파일이 통과했고,
   * 그 화면에서만 카드에 "ai" 같은 원본 id 가 노출됐다. 필수로 두면 같은
   * 누락이 타입 오류로 잡힌다. 두 조회표는 loadPublicMaps 로 함께 얻는다.
   */
  industryLabels: Map<string, string>,
  domains: Map<string, DomainDef>,
): PublicTech {
  const { demo, metrics, resources, health, visibility, previous_ids, related_tech, ...rest } =
    tech;
  void health;
  void visibility;
  void previous_ids;
  void related_tech;

  /**
   * 과제 연계 기술의 대외 제외 항목.
   *
   * 공개 범위를 낮추는 것과는 다른 문제다 — 기술은 외부에 공개하되 그중
   * 일부 항목만 가려야 한다. 화면마다 조건문을 두면 한 곳을 빠뜨리는 순간
   * 새어 나가므로, 공개 직렬화라는 한 지점에서 통째로 지운다.
   */
  const restricted = tech.restricted;

  // 축이 삭제된 뒤 남은 기술도 화면에서 사라지면 안 된다. 라벨은 id 로
  // 대신하고 색만 기본값으로 떨어뜨려 목록에는 그대로 남긴다.
  const def = domains.get(tech.domain);

  return {
    ...rest,
    // 과제명·수요처, 알고리즘·모델 정보, 소속 조직
    /*
      담당팀·과제명은 공개 화면에 내보내지 않는다. 방문자의 도입 판단에
      보태는 것이 없고, 조직 구성과 과제 수행 내역을 굳이 알리는 셈이 된다.
      관리자 화면에서는 내부 관리용으로 계속 쓴다.
    */
    project: undefined,
    base_model: restricted ? undefined : rest.base_model,
    team: undefined,
    domain_label: def?.label ?? tech.domain,
    domain_short: def?.short_label ?? def?.label ?? tech.domain,
    domain_accent: def?.accent ?? FALLBACK_ACCENT,
    // 산업군은 id 로 저장하고 화면에는 라벨로 내보낸다. 컴포넌트마다 마스터를
    // 다시 조회하면 같은 변환이 흩어지므로 이 경계에서 한 번만 바꾼다.
    industries: rest.industries.map((id) => industryLabels.get(id) ?? id),
    demo: toPublicDemo(demo),
    // 성능 수치·시험 결과. 평가 데이터셋에 실증 장소가 드러나는 경우도 있다.
    metrics: restricted
      ? []
      : metrics.map(({ dataset_url, ...metric }) => {
          void dataset_url;
          return metric;
        }),
    resources: resources.filter((r) => !r.internal),
  };
}

/**
 * 목록에 실을 대상인지 판정한다.
 *
 * 링크 공개는 여기서 걸러진다. 카탈로그·연계 기술·제품 구성 어디에도
 * 실리면 안 되고, 오직 주소를 아는 사람만 닿아야 한다.
 */
export function isExternallyVisible(tech: Tech): boolean {
  return isListed(tech.visibility);
}

/** 주소로 직접 들어온 요청에 열어 줄 대상인지 판정한다. */
export function isReachable(tech: Tech): boolean {
  return isReachableByLink(tech.visibility);
}

export function isSolutionVisible(solution: Solution): boolean {
  return solution.visibility === 'public';
}

/** 산업군 id → 라벨 조회표. 공개 화면으로 넘기기 전에 한 번 만들어 재사용한다. */
export function industryLabelMap(industries: Industry[]): Map<string, string> {
  return new Map(industries.map((industry) => [industry.id, industry.label]));
}

/** 대분류 id → 정의 조회표. */
export function domainMap(domains: DomainDef[]): Map<string, DomainDef> {
  return new Map(domains.map((domain) => [domain.id, domain]));
}
