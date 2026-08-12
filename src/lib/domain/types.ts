import type {
  Accent,
  DemoType,
  Deployment,
  DevType,
  Domain,
  InputKind,
  Maturity,
  MetricDirection,
  OfferingKind,
  ReleaseStage,
  Visibility,
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
  /**
   * 카드 루프의 첫 화면.
   * 상세용 thumbnail 은 전체 화면 구도라 카드 루프와 구도가 달라, 재생이
   * 시작되는 순간 화면이 튄다. 루프와 같은 구도의 정지 이미지를 따로 둔다.
   */
  loop_poster?: string;
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
  verification: {
    level: VerificationLevel;
    body?: string;
    /** 인증 시험명 — 상세 화면 인증 블록의 제목. 예: 지능형 CCTV 성능시험인증(침입) */
    cert_name?: string;
    /** 인증번호. 예: KISA-IC-2024-004 */
    cert_no?: string;
    /** 인증 유효기간. 예: 2024.3.28 ~ 2027.3.27 */
    valid_until?: string;
  };
  dev_type: DevType;
  base_model?: string;
  demo: Demo;
  media: Media;
  resources: Resource[];
  related_tech: string[];
  /** 임시저장 → 내부 공개 → 링크 공개 → 외부 공개 */
  visibility: Visibility;
  /**
   * 과제 연계로 대외 공개가 제한된 기술.
   *
   * 정부 과제로 개발한 기술은 공개 범위와 별개로 내보낼 수 없는 항목이 있다.
   * 2026 국제치안산업대전 전시 기획안의 「공통 제외 항목」 기준이다.
   *   과제명·수요처명, 알고리즘·AI 모델 정보, 성능 수치·시험 결과,
   *   실증 장소, 개발 일정·예산
   *
   * 공개 범위를 낮추는 것으로는 해결되지 않는다 — 외부 공개는 해야 하는데
   * 그중 일부 항목만 가려야 하기 때문이다. 그래서 별도의 축으로 둔다.
   */
  restricted: boolean;
  order: number;
  health?: Health;
  /**
   * 예전에 쓰던 id 목록.
   *
   * id 를 바꾸면 그전에 나간 링크가 전부 깨진다. 영업 담당이 메일로 보낸
   * 기술 링크나 전시회 자료의 QR 이 여기에 해당한다. 옛 id 를 남겨 두고
   * 상세 화면에서 현재 주소로 넘겨 준다.
   */
  previous_ids?: string[];
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

export type PublicTech = Omit<
  Tech,
  | 'demo'
  | 'metrics'
  | 'resources'
  | 'health'
  | 'visibility'
  | 'previous_ids'
  // 연계 기술 id 는 내보내지 않는다. 링크 공개 기술의 id 가 여기 섞여 나가면
  // 주소를 조립할 수 있어 "주소를 아는 사람만" 이 무너진다. 화면에 필요한
  // 연계 기술은 서버가 공개 대상만 골라 따로 넘긴다.
  | 'related_tech'
> & {
  demo: PublicDemo;
  metrics: PublicMetric[];
  resources: Resource[];
  /**
   * 대분류의 표시 정보를 이 경계에서 붙여 보낸다.
   *
   * domain 은 id 만 담고 있어 화면이 그대로 쓰면 "digital_twin" 이 노출된다.
   * 컴포넌트마다 마스터를 다시 조회하면 같은 변환이 흩어지므로, 산업군
   * 라벨과 같은 방식으로 여기서 한 번만 해결한다.
   */
  domain_label: string;
  domain_short: string;
  domain_accent: Accent;
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
  visibility: Visibility;
  order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 하위 카테고리 마스터. 관리자는 선택이 기본이고 신규 생성은 별도 동작이다.
 * 키는 대분류 id — 대분류가 관리자에서 늘어나므로 고정 키를 쓰지 않는다.
 */
export type CategoryStore = Record<string, string[]>;

/**
 * 대분류(축) 마스터.
 *
 * 산업군과 같은 이유로 목록에서 고르게 한다. 다른 점은 축이 화면 구성까지
 * 좌우한다는 것이다 — 랜딩의 축 카드, 카드의 색 점, 필터 칩이 모두 여기서
 * 나온다. 그래서 라벨 외에 화면에 쓰는 문구와 색까지 함께 갖는다.
 */
export interface DomainDef {
  id: string;
  /** 필터와 상세에 쓰는 정식 이름 (예: "AI 요소기술") */
  label: string;
  /** 카드처럼 폭이 좁은 자리에 쓰는 짧은 이름 (예: "AI") */
  short_label: string;
  /**
   * 기술이 하는 일 한 줄.
   *
   * 산업이나 제품을 끌어오지 않는다. 셋은 같은 목록을 보는 서로 다른
   * 기준인데 기술 설명이 적용처를 말해 버리면 세 기준이 겹쳐 읽힌다.
   */
  lead: string;
  /** 어떤 데이터를 어떤 방법으로 다루는지. lead 를 다시 풀어 쓰지 않는다. */
  description: string;
  /** ACCENTS 중 하나. 임의 hex 를 허용하지 않는다. */
  accent: Accent;
  order: number;
}
