import type { Domain } from './domain/enums';

/**
 * 브랜드 문구의 단일 출처.
 *
 * 여기 값만 고치면 화면 전체가 따라온다. 문구를 컴포넌트에 흩뿌리면
 * 브랜드가 바뀔 때마다 전수 검색을 해야 하므로 이 파일에서만 관리한다.
 * 회사명·태그라인·문의처는 확정본으로 교체하면 된다.
 */
export const BRAND = {
  name: '인피닉 기술연구소',
  nameEn: 'INFINIQ Research',
  /** 헤더 로고 자리의 축약 표기 */
  shortName: 'INFINIQ',

  /** 우리가 무엇을 하는 조직인지 한 줄로. */
  tagline: '현장에서 검증한 AI · 디지털 트윈 · 공간 분석 기술',

  /** 히어로 헤드라인 — 기술 나열이 아니라 방문자가 얻는 결과를 말한다. */
  headline: '보이지 않던 현장을\n판단할 수 있는 데이터로',

  /** 히어로 본문. 3줄을 넘기지 않는다. */
  intro:
    'CCTV 영상, 설비 센서, 도시 공간 데이터를 해석해 사람이 놓치는 상황을 먼저 찾아냅니다. 모든 기술은 실제 데이터로 측정한 성능 지표와 함께 공개합니다.',

  /** 카탈로그 상단에서 신뢰 지표 앞에 붙는 문구 */
  proofLead: '수치는 각 기술의 평가 데이터셋과 측정 조건을 함께 공개합니다.',

  contact: {
    label: '도입 문의',
    email: 'contact@infiniq.co.kr',
    /** 문의 시 방문자가 무엇을 얻는지 — CTA 아래 한 줄 */
    promise: '기술별 상세 자료와 적용 사례를 영업일 기준 2일 내 회신드립니다.',
  },
} as const;

/**
 * 3축 서사.
 * 카탈로그·랜딩이 같은 문구를 쓴다. 축마다 "무엇을 푸는가"를 한 줄로 규정한다.
 */
export const DOMAIN_NARRATIVE: Record<
  Domain,
  { title: string; lead: string; description: string }
> = {
  ai: {
    title: 'AI 요소기술',
    lead: '영상과 언어에서 상황을 읽어냅니다',
    description:
      '객체 탐지·추적, 이상행동 인지, 생성 모델, 언어·지식 처리. 관제 인력이 동시에 감시할 수 없는 범위를 대신 지켜봅니다.',
  },
  digital_twin: {
    title: '디지털 트윈',
    lead: '현장을 화면 안으로 옮깁니다',
    description:
      '설비 3D 모델에 실시간 센서를 결합해 순회 없이 상태를 확인하고, 변경 전에 결과를 시뮬레이션합니다.',
  },
  spatial: {
    title: '공간 분석',
    lead: '지도 위에서 의사결정 근거를 만듭니다',
    description:
      '지형·시설·이동 데이터를 결합해 재해 위험 구간과 투자 우선순위를 정량적으로 제시합니다.',
  },
};
