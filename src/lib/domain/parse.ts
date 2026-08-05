import {
  DEMO_TYPES,
  DEPLOYMENTS,
  OFFERING_KINDS,
  RELEASE_STAGES,
  DEV_TYPES,
  DOMAINS,
  INPUT_KINDS,
  MATURITY_LEVELS,
  METRIC_DIRECTIONS,
  STATUSES,
  VERIFICATION_LEVELS,
  isOneOf,
} from './enums';
import type { Demo, DemoSample, Metric, Resource, Solution, SolutionStep, Tech } from './types';

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

type Raw = Record<string, unknown>;

function asRecord(value: unknown, field: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidInputError(`${field} 형식이 올바르지 않습니다.`);
  }
  return value as Raw;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter(Boolean);
}

function num(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : Number(str(value));
  if (!Number.isFinite(n)) throw new InvalidInputError(`${field} 은(는) 숫자여야 합니다.`);
  return n;
}

function pick<T extends string>(list: readonly T[], value: unknown, field: string): T {
  if (!isOneOf(list, value)) {
    throw new InvalidInputError(`${field} 은(는) 정해진 값 중에서 선택해야 합니다.`);
  }
  return value;
}

/** id 는 URL 에 그대로 들어가므로 안전한 문자만 허용한다. */
function parseId(value: unknown): string {
  const id = str(value).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) {
    throw new InvalidInputError('id 는 영문 소문자·숫자·하이픈으로 2~64자여야 합니다.');
  }
  return id;
}

function parseMetrics(value: unknown): Metric[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const raw = asRecord(item, `지표 ${index + 1}`);
    const label = str(raw.label);
    if (!label) throw new InvalidInputError(`지표 ${index + 1} 의 지표명이 비어 있습니다.`);

    return {
      label,
      value: num(raw.value, `지표 "${label}" 의 달성값`),
      target: num(raw.target, `지표 "${label}" 의 목표값`),
      // 방향은 기본값을 두지 않는다. 누락되면 저장을 막아 관리자가 반드시 고르게 한다.
      direction: pick(METRIC_DIRECTIONS, raw.direction, `지표 "${label}" 의 방향`),
      condition: str(raw.condition) || undefined,
      dataset: str(raw.dataset) || undefined,
      source: str(raw.source) || undefined,
      dataset_url: str(raw.dataset_url) || undefined,
    };
  });
}

function parseSamples(value: unknown): DemoSample[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const raw = asRecord(item, '데모 샘플');
      return {
        label: str(raw.label),
        path: str(raw.path) || undefined,
        text: str(raw.text) || undefined,
      };
    })
    .filter((sample) => sample.label && (sample.path || sample.text !== undefined));
}

function parseDemo(value: unknown): Demo {
  const raw = asRecord(value, '데모');
  const type = pick(DEMO_TYPES, raw.type, '데모 타입');

  switch (type) {
    case 'api':
      return {
        type,
        endpoint: str(raw.endpoint),
        api_name: str(raw.api_name) || '/predict',
        input_kind: pick(INPUT_KINDS, raw.input_kind, '입력 형태'),
        samples: parseSamples(raw.samples),
      };
    case 'embed': {
      const params = raw.chromeless_params;
      const chromeless: Record<string, string> = {};
      if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
        for (const [key, v] of Object.entries(params as Raw)) {
          if (str(key)) chromeless[str(key)] = str(v);
        }
      }
      return {
        type,
        embed_url: str(raw.embed_url),
        chromeless_params: Object.keys(chromeless).length > 0 ? chromeless : undefined,
      };
    }
    case 'video':
      return {
        type,
        src: str(raw.src),
        src_webm: str(raw.src_webm) || undefined,
        poster: str(raw.poster) || undefined,
      };
    case 'metric':
      return { type, highlight_metric: str(raw.highlight_metric) || undefined };
  }
}

function parseResources(value: unknown): Resource[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = asRecord(item, '관련 자료');
      return { label: str(raw.label), url: str(raw.url), internal: raw.internal === true };
    })
    .filter((resource) => resource.label && resource.url);
}

/**
 * 관리자 입력 → Tech.
 *
 * 드롭다운 항목은 여기서 다시 검증한다. 화면의 select 만 믿으면 요청을 직접
 * 만들어 임의 값을 넣을 수 있고, 그렇게 들어온 값 하나가 카탈로그 필터와
 * 지표 판정을 조용히 망가뜨린다.
 *
 * 자유 입력(기술명·요약·지표명·수치·데이터셋명·조건 단서)은 다듬기만 한다.
 */
export function parseTechInput(input: unknown, existing?: Tech | null): Tech {
  const raw = asRecord(input, '기술 정보');
  const business = asRecord(raw.business ?? {}, 'business');
  const io = asRecord(business.io ?? {}, 'business.io');
  const media = asRecord(raw.media ?? {}, 'media');
  const verification = asRecord(raw.verification ?? {}, 'verification');
  const visibility = asRecord(raw.visibility ?? {}, 'visibility');

  const name_ko = str(raw.name_ko);
  if (!name_ko) throw new InvalidInputError('기술명(한글)은 필수입니다.');

  const maturity = str(business.maturity);
  const now = new Date().toISOString();

  return {
    id: parseId(raw.id),
    name_ko,
    name_en: str(raw.name_en) || undefined,
    domain: pick(DOMAINS, raw.domain, '대분류'),
    category: str(raw.category),
    industries: strList(raw.industries),
    summary: str(raw.summary),
    team: str(raw.team) || undefined,
    project: str(raw.project) || undefined,
    metrics: parseMetrics(raw.metrics),
    business: {
      problem: str(business.problem) || undefined,
      target_industries: strList(business.target_industries),
      io: { input: str(io.input), output: str(io.output) },
      requirements: strList(business.requirements),
      // draft 는 성숙도가 비어 있어도 저장된다. 발행 시점에 validate 가 막는다.
      maturity: maturity ? pick(MATURITY_LEVELS, maturity, '성숙도') : undefined,
    },
    verification: {
      level: pick(VERIFICATION_LEVELS, verification.level, '검증 등급'),
      body: str(verification.body) || undefined,
    },
    dev_type: pick(DEV_TYPES, raw.dev_type, '개발 구분'),
    base_model: str(raw.base_model) || undefined,
    demo: parseDemo(raw.demo),
    media: {
      thumbnail: str(media.thumbnail) || undefined,
      loop: str(media.loop) || undefined,
      video: str(media.video) || undefined,
      loop_webm: str(media.loop_webm) || undefined,
      video_webm: str(media.video_webm) || undefined,
      loop_poster: str(media.loop_poster) || undefined,
    },
    resources: parseResources(raw.resources),
    related_tech: strList(raw.related_tech),
    visibility: {
      internal: visibility.internal !== false,
      external: visibility.external === true,
    },
    status: pick(STATUSES, raw.status, '상태'),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : (existing?.order ?? 0),
    health: existing?.health,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

function parseSteps(value: unknown): SolutionStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = asRecord(item, '구성 기술');
      return { tech_id: str(raw.tech_id), role: str(raw.role) };
    })
    .filter((step) => step.tech_id);
}

/**
 * 관리자 입력 → Solution.
 *
 * 구성 기술은 id 로만 참조한다. 기술 정보를 복사해 두면 기술을 수정했을 때
 * 시나리오에는 옛 값이 남아 두 화면이 서로 다른 말을 하게 된다.
 */
export function parseSolutionInput(input: unknown, existing?: Solution | null): Solution {
  const raw = asRecord(input, '묶음 정보');

  const title = str(raw.title);
  if (!title) throw new InvalidInputError('제목은 필수입니다.');

  const kind = pick(OFFERING_KINDS, raw.kind, '종류');
  const release = str(raw.release);
  const deployment = Array.isArray(raw.deployment)
    ? raw.deployment.map((d) => pick(DEPLOYMENTS, d, '배포 형태'))
    : [];
  const media = asRecord(raw.media ?? {}, 'media');

  const now = new Date().toISOString();

  return {
    id: parseId(raw.id),
    kind,
    title,
    name_en: str(raw.name_en) || undefined,
    summary: str(raw.summary),
    problem: str(raw.problem),
    industries: strList(raw.industries),
    steps: parseSteps(raw.steps),
    // 제품 전용 항목은 시나리오에 남기지 않는다. 남으면 종류를 바꿨을 때
    // 화면에 이전 종류의 정보가 따라다닌다.
    deployment: kind === 'product' && deployment.length > 0 ? deployment : undefined,
    release: kind === 'product' && release ? pick(RELEASE_STAGES, release, '출시 단계') : undefined,
    media: {
      thumbnail: str(media.thumbnail) || undefined,
      loop: str(media.loop) || undefined,
      video: str(media.video) || undefined,
      loop_webm: str(media.loop_webm) || undefined,
      video_webm: str(media.video_webm) || undefined,
    },
    status: pick(STATUSES, raw.status, '상태'),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : (existing?.order ?? 0),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export interface SolutionIssue {
  label: string;
}

/**
 * 시나리오 발행 조건.
 * 문제 서술과 구성 기술이 없으면 "기술 나열"과 다를 바 없어 영업에 쓸 수 없다.
 */
export function validateSolutionForPublish(solution: Solution): SolutionIssue[] {
  const issues: SolutionIssue[] = [];

  if (!solution.problem.trim()) issues.push({ label: '해결하는 문제' });
  if (solution.industries.length === 0) issues.push({ label: '산업군' });

  /**
   * 구성 기술 요구는 종류마다 다르다.
   *
   * 시나리오는 조합 자체가 내용이라 최소 2개가 없으면 보여줄 것이 없다.
   * 제품은 구성 기술을 아직 정리하지 못했어도 실제로 존재하는 판매 단위이므로
   * 요구하지 않는다 — 요구하면 라인업이 화면에서 통째로 사라진다.
   */
  if (solution.kind === 'scenario' && solution.steps.length < 2) {
    issues.push({ label: '구성 기술 2개 이상' });
  }
  if (solution.steps.some((step) => !step.role.trim())) {
    issues.push({ label: '구성 기술의 역할 설명' });
  }

  return issues;
}
