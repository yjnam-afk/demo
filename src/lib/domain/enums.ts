/**
 * 고정 선택지의 단일 출처.
 * 관리자 폼의 드롭다운, 발행 검증, 공개 화면의 라벨이 모두 이 파일을 참조한다.
 * 자유 입력으로 흘러 들어가 데이터가 오염되는 것을 막기 위해 값은 여기서만 늘린다.
 */

export const DOMAINS = ['ai', 'digital_twin', 'spatial'] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'AI 요소기술',
  digital_twin: '디지털 트윈',
  spatial: '공간 분석',
};

export const DOMAIN_SHORT_LABELS: Record<Domain, string> = {
  ai: 'AI',
  digital_twin: '디지털트윈',
  spatial: '공간분석',
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

export const STATUSES = ['draft', 'published'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  draft: '임시저장',
  published: '발행',
};

/** 문자열이 해당 선택지 목록에 속하는지 확인한다. 관리자 입력 검증에 쓴다. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}
