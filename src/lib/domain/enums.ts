/**
 * 고정 선택지의 단일 출처.
 * 관리자 폼의 드롭다운, 발행 검증, 공개 화면의 라벨이 모두 이 파일을 참조한다.
 * 자유 입력으로 흘러 들어가 데이터가 오염되는 것을 막기 위해 값은 여기서만 늘린다.
 */

/**
 * 대분류(축)는 이 파일에 고정하지 않는다.
 *
 * 연구소의 기술 축은 조직 개편이나 신규 사업으로 바뀐다. 열거형에 박아 두면
 * 축 하나 추가하는 데 배포가 필요하므로, 마스터를 data/domains.json 에 두고
 * 관리자 화면에서 관리한다. 여기서는 id 가 문자열이라는 것만 정한다.
 *
 * 다만 자유 문자열이 그대로 들어오면 산업군에서 겪은 문제("자율주행"과
 * "자율 주행"이 따로 쌓이는)가 반복되므로, 저장 시 마스터에 있는 id 인지
 * 반드시 검사한다 (parseTechInput 의 allowedDomains).
 */
export type Domain = string;

/**
 * 축에 붙일 수 있는 강조색.
 *
 * 색은 자유 입력이 아니라 이 목록에서 고른다. 임의의 hex 를 허용하면
 * 채도 높은 색이 들어와 화면이 무너진다. 값은 globals.css 의 CSS 변수와
 * 1:1 로 대응한다.
 */
export const ACCENTS = ['blue', 'teal', 'bronze', 'plum', 'slate'] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_LABELS: Record<Accent, string> = {
  blue: '청색',
  teal: '청록',
  bronze: '갈색',
  plum: '자주',
  slate: '회청',
};

export const VERIFICATION_LEVELS = ['third_party', 'self_test', 'in_development'] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const VERIFICATION_LABELS: Record<VerificationLevel, string> = {
  third_party: '제3자 인증',
  self_test: '자체 시험',
  in_development: '개발 중',
};

export const DEV_TYPES = ['custom', 'opensource_finetune', 'opensource'] as const;
export type DevType = (typeof DEV_TYPES)[number];

export const DEV_TYPE_LABELS: Record<DevType, string> = {
  custom: '자체 개발',
  opensource_finetune: '오픈소스 파인튜닝',
  opensource: '오픈소스 활용',
};

export const DEMO_TYPES = ['api', 'embed', 'video', 'metric'] as const;
export type DemoType = (typeof DEMO_TYPES)[number];

export const DEMO_TYPE_LABELS: Record<DemoType, string> = {
  api: '실시간 데모',
  embed: '웹 데모',
  video: '데모 영상',
  metric: '성능 지표',
};

export const INPUT_KINDS = ['video_upload', 'image_upload', 'text_input', 'none'] as const;
export type InputKind = (typeof INPUT_KINDS)[number];

export const INPUT_KIND_LABELS: Record<InputKind, string> = {
  video_upload: '영상 업로드',
  image_upload: '이미지 업로드',
  text_input: '텍스트 입력',
  none: '샘플 실행 전용',
};

export const MATURITY_LEVELS = ['field_proven', 'pilot_done', 'lab_verified', 'research'] as const;
export type Maturity = (typeof MATURITY_LEVELS)[number];

export const MATURITY_LABELS: Record<Maturity, string> = {
  field_proven: '현장 적용',
  pilot_done: '실증 완료',
  lab_verified: '자체 검증',
  research: '연구 단계',
};

export const METRIC_DIRECTIONS = ['higher', 'lower'] as const;
export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export const METRIC_DIRECTION_LABELS: Record<MetricDirection, string> = {
  higher: '높을수록 좋음',
  lower: '낮을수록 좋음',
};

/**
 * 공개 범위. 하나의 축이다.
 *
 * 전에는 상태(임시저장·발행)와 노출(내부·외부)을 따로 두었는데, 곱하면
 * "발행 / 내부 공개" 같은 조합이 나온다. 발행은 이미 "살아 있다" 는 뜻이라
 * 노출 범위와 겹치고, 관리자는 두 값을 매번 맞춰야 했다.
 *
 * 순서가 곧 범위의 크기다 — 뒤로 갈수록 더 넓게 보인다.
 */
export const VISIBILITIES = ['draft', 'internal', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  draft: '임시저장',
  internal: '내부 공개',
  public: '외부 공개',
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  draft: '작성 중입니다. 어디에도 보이지 않습니다.',
  internal: '사내에서만 봅니다. 공개 사이트에는 나오지 않습니다.',
  public: '공개 사이트에 나옵니다.',
};

/** 문자열이 해당 선택지 목록에 속하는지 확인한다. 관리자 입력 검증에 쓴다. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/**
 * 묶음(Offering)의 종류.
 *
 * product 는 실제로 파는 단위이고 scenario 는 아직 제품화되지 않은 제안형 조합이다.
 * 둘은 화면에서 다르게 읽혀야 하지만 구조가 같아(구성 기술 + 역할) 한 타입으로 둔다.
 */
export const OFFERING_KINDS = ['product', 'scenario'] as const;
export type OfferingKind = (typeof OFFERING_KINDS)[number];

export const OFFERING_KIND_LABELS: Record<OfferingKind, string> = {
  product: '제품',
  scenario: '솔루션 시나리오',
};

/** 제품 배포 형태 */
export const DEPLOYMENTS = ['on_premise', 'saas'] as const;
export type Deployment = (typeof DEPLOYMENTS)[number];

export const DEPLOYMENT_LABELS: Record<Deployment, string> = {
  on_premise: '온프레미스',
  saas: 'SaaS',
};

/** 제품 출시 단계 */
export const RELEASE_STAGES = ['ga', 'beta', 'planned'] as const;
export type ReleaseStage = (typeof RELEASE_STAGES)[number];

export const RELEASE_STAGE_LABELS: Record<ReleaseStage, string> = {
  ga: '정식 출시',
  beta: '베타',
  planned: '개발 중',
};
