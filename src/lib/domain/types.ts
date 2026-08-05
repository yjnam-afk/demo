import type {
  DemoType,
  Deployment,
  DevType,
  Domain,
  InputKind,
  Maturity,
  MetricDirection,
  OfferingKind,
  ReleaseStage,
  Status,
  VerificationLevel,
} from './enums';

export interface Metric {
  label: string;
  value: number;
  target: number;
  /**
   * 달성 판정 방향. 기본값을 두지 않는다 — MAE·FID·Angular Error 처럼
   * 낮을수록 좋은 지표를 'higher' 로 잘못 판정하면 초과 달성이 미달로 표시된다.
   */
  direction: MetricDirection;
  /** "40px 이상 객체 한정" 같은 목표치의 전제. 값 옆에 항상 함께 노출한다. */
  condition?: string;
  dataset?: string;
  source?: string;
  /** 평가 데이터 원본 링크 — 내부 전용. 외부 뷰에서 제거된다. */
  dataset_url?: string;
}

export interface BusinessIO {
  input: string;
  output: string;
}

export interface Business {
  problem: string;
  target_industries: string[];
  io: BusinessIO;
  /** 선택 항목. 비어 있으면 관리자 목록에 "도입 정보 미비" 경고가 뜬다. */
  requirements: string[];
  maturity: Maturity;
}

export interface DemoSample {
  label: string;
  /** 업로드형 입력의 사전 준비 파일 경로 */
  path?: string;
  /** text_input 형 입력의 사전 준비 문구 */
  text?: string;
}

/**
 * 데모는 판별 유니온이다. 4종 외의 분기는 타입 레벨에서 불가능하다.
 * endpoint / embed_url 은 서버에서만 읽으며 공개 직렬화 과정에서 제거된다.
 */
export type Demo =
  | {
      type: 'api';
      endpoint: string;
      api_name: string;
      input_kind: InputKind;
      samples: DemoSample[];
    }
  | {
      type: 'embed';
      embed_url: string;
      /** 자체 웹앱의 헤더·툴바를 감추기 위한 질의 파라미터 */
      chromeless_params?: Record<string, string>;
    }
  | {
      type: 'video';
      src: string;
      /** WebM/VP9 대체 소스 (선택) */
      src_webm?: string;
      poster?: string;
    }
  | {
      type: 'metric';
      /** 크게 보여줄 지표의 label. 없으면 첫 지표를 쓴다. */
      highlight_metric?: string;
    };

export interface Media {
  thumbnail?: string;
  /** 카드에서 무음 반복 재생하는 짧은 영상 */
  loop?: string;
  /** 상세 화면 및 데모 실패 시 폴백으로 쓰는 전체 데모 영상 */
  video?: string;
  /**
   * 같은 영상의 WebM/VP9 판본(선택).
   * mp4(H.264)를 우선 제공하되, H.264 디코더가 없는 브라우저 빌드에서도
   * 재생되도록 대체 소스를 함께 내보낸다. 없으면 mp4 만 쓴다.
   */
  loop_webm?: string;
  video_webm?: string;
}

export interface Resource {
  label: string;
  url: string;
  /** true 면 내부 문서. 외부 뷰에서 렌더링하지 않는다. */
  internal: boolean;
}

export interface Health {
  status: 'ok' | 'fail' | 'unknown';
  checked_at: string;
  latency_ms?: number;
  message?: string;
}

export interface Tech {
  id: string;
  name_ko: string;
  name_en?: string;
  domain: Domain;
  category: string;
  industries: string[];
  summary: string;
  team?: string;
  project?: string;
  /** 비어 있을 수 있다. 디지털트윈·공간분석은 정량 지표가 없는 경우가 많다. */
  metrics: Metric[];
  /** draft 는 부분 입력을 허용하고, 발행 시점에 완전성을 검사한다. */
  business: Partial<Business>;
  verification: { level: VerificationLevel; body?: string };
  dev_type: DevType;
  base_model?: string;
  demo: Demo;
  media: Media;
  resources: Resource[];
  related_tech: string[];
  visibility: { internal: boolean; external: boolean };
  status: Status;
  order: number;
  health?: Health;
  created_at: string;
  updated_at: string;
}

/**
 * 외부 공개 뷰로 전달되는 형태.
 * 내부망 엔드포인트, 내부 문서 링크, 평가 데이터 원본 링크가 제거되어 있다.
 * 데모 호출에 필요한 정보는 기술 id 뿐이며 실제 주소는 서버가 조회한다.
 */
export type PublicDemo =
  | { type: 'api'; input_kind: InputKind; samples: DemoSample[] }
  | { type: 'embed' }
  | { type: 'video'; src: string; src_webm?: string; poster?: string }
  | { type: 'metric'; highlight_metric?: string };

export type PublicMetric = Omit<Metric, 'dataset_url'>;

export type PublicTech = Omit<Tech, 'demo' | 'metrics' | 'resources' | 'health' | 'visibility'> & {
  demo: PublicDemo;
  metrics: PublicMetric[];
  resources: Resource[];
};

export interface SolutionStep {
  /** 구성 기술의 id. 존재하지 않거나 비공개인 기술은 렌더 단계에서 걸러진다. */
  tech_id: string;
  /** 이 묶음에서 해당 기술이 맡는 역할 */
  role: string;
}

/**
 * 산업군 마스터.
 *
 * 자유 입력으로 두면 "자율주행"과 "자율 주행"이 따로 쌓여 산업별 화면이 무너진다.
 * 목록에서 고르게 하고 id 로 참조해, 라벨을 고쳐도 연결이 끊기지 않게 한다.
 */
export interface Industry {
  id: string;
  label: string;
  /** 산업별 화면 상단에 쓰는 한 줄 설명 */
  description?: string;
}

/**
 * 제품과 솔루션 시나리오를 함께 담는 타입.
 *
 * 둘 다 "기술 여러 개를 묶어 하나의 제안으로 만든 것"이라 구조가 같다.
 * 다른 것은 파는 실체가 있느냐뿐이므로 kind 로 가르고 제품 전용 항목만
 * 선택 필드로 둔다. 타입을 둘로 나누면 검증·관리자 폼·저장소가 그대로 복제된다.
 */
export interface Solution {
  id: string;
  kind: OfferingKind;
  title: string;
  /** 제품의 영문 표기 (AI-STUDIO 등) */
  name_en?: string;
  summary: string;
  /** 이 묶음이 해결하는 고객의 문제 */
  problem: string;
  /** 산업군 마스터의 id 목록 */
  industries: string[];
  steps: SolutionStep[];
  /** 제품 전용 — 배포 형태 */
  deployment?: Deployment[];
  /** 제품 전용 — 출시 단계 */
  release?: ReleaseStage;
  media?: Media;
  status: Status;
  order: number;
  created_at: string;
  updated_at: string;
}

/** 하위 카테고리 마스터. 관리자는 선택이 기본이고 신규 생성은 별도 동작이다. */
export interface CategoryStore {
  /** 대분류별 하위 카테고리 목록 */
  ai: string[];
  digital_twin: string[];
  spatial: string[];
}
