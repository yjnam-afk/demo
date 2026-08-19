import {
  ACCENTS,
  DEMO_TYPES,
  DEPLOYMENTS,
  OFFERING_KINDS,
  RELEASE_STAGES,
  INPUT_KINDS,
  MATURITY_LEVELS,
  METRIC_DIRECTIONS,
  VISIBILITIES,
  VERIFICATION_LEVELS,
  isOneOf,
} from './enums';
import { normalizeMediaPath } from '@/lib/gdrive';
import type {
  Demo,
  DemoModel,
  DemoSample,
  DomainDef,
  Metric,
  Resource,
  Solution,
  SolutionStep,
  Tech,
} from './types';

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

/**
 * 대분류 id 는 밑줄을 허용한다.
 *
 * parseId 는 경로 세그먼트(`/tech/[id]`)용이라 슬러그 규칙이 엄격하다. 축 id 는
 * 질의 문자열(`?domain=digital_twin`)에만 쓰이고, 이미 저장된 digital_twin 이
 * 그 규칙에 걸린다. 그렇다고 자유 입력으로 두면 공백이나 한글이 들어와
 * 링크가 깨지므로 밑줄만 더 허용한다.
 */
function parseDomainId(value: unknown): string {
  const id = str(value).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) {
    throw new InvalidInputError('대분류 id 는 영문 소문자·숫자·하이픈·밑줄로 2~64자여야 합니다.');
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
      /*
        목표값은 비워 둘 수 있다. str() 은 숫자를 '' 로 돌려주므로
        숫자 타입을 먼저 확인해야 0 이나 90 이 "비어 있음"으로 새지 않는다.
      */
      target:
        typeof raw.target === 'number' || str(raw.target) !== ''
          ? num(raw.target, `지표 "${label}" 의 정량 목표`)
          : undefined,
      // 방향은 기본값을 두지 않는다. 누락되면 저장을 막아 관리자가 반드시 고르게 한다.
      direction: pick(METRIC_DIRECTIONS, raw.direction, `지표 "${label}" 의 방향`),
      // 과거 데이터는 condition 단수 문자열이다. 첫 항목으로 흡수한다.
      conditions: strList(raw.conditions).length
        ? strList(raw.conditions)
        : str(raw.condition)
          ? [str(raw.condition)]
          : [],
      dataset: str(raw.dataset) || undefined,
      source: str(raw.source) || undefined,
      benchmark: str(raw.benchmark) || undefined,
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


/**
 * 고를 수 있는 모델 목록.
 * 이름과 주소가 모두 있어야 목록에 세운다 — 둘 중 하나가 빈 항목은 고르는
 * 순간 실패하므로 읽기 경계에서 떨군다.
 */
function parseModels(value: unknown): DemoModel[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const raw = asRecord(item, '데모 모델');
      return {
        label: str(raw.label),
        endpoint: str(raw.endpoint) || undefined,
        api_name: str(raw.api_name) || undefined,
        value: str(raw.value) || undefined,
        note: str(raw.note) || undefined,
      };
    })
    /*
      이름은 필수고, 주소나 인자값 중 하나는 있어야 한다. 둘 다 없으면
      기본 엔드포인트를 같은 인자로 두 번 부르는 항목이라 고를 의미가 없다.
    */
    .filter((model) => model.label && (model.endpoint || model.value));
}

/** 미디어 경로 문자열. 드라이브 공유 링크는 재생 가능한 내부 경로로 바꿔 저장한다. */
function mediaStr(value: unknown): string {
  return normalizeMediaPath(str(value));
}

function parseDemo(value: unknown): Demo {
  const raw = asRecord(value, '데모');
  const type = pick(DEMO_TYPES, raw.type, '데모 타입');

  switch (type) {
    case 'api': {
      const models = parseModels(raw.models);
      return {
        type,
        endpoint: str(raw.endpoint),
        api_name: str(raw.api_name) || '/predict',
        input_kind: pick(INPUT_KINDS, raw.input_kind, '입력 형태'),
        samples: parseSamples(raw.samples),
        allow_upload: raw.allow_upload === true,
        models: models.length > 0 ? models : undefined,
      };
    }
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
        src: mediaStr(raw.src),
        src_webm: mediaStr(raw.src_webm) || undefined,
        poster: mediaStr(raw.poster) || undefined,
      };
    case 'metric':
      return { type, highlight_metric: str(raw.highlight_metric) || undefined };
    case 'gallery':
      return {
        type,
        items: Array.isArray(raw.items)
          ? raw.items
              .map((item) => {
                const r = asRecord(item, '갤러리 샘플');
                return {
                  label: str(r.label),
                  input: mediaStr(r.input),
                  output: mediaStr(r.output),
                  note: str(r.note) || undefined,
                };
              })
              // 이미지가 하나도 없는 빈 줄은 저장하지 않는다
              .filter((item) => item.input || item.output)
          : [],
      };
    case 'none':
      return { type };
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
export function parseTechInput(
  input: unknown,
  existing?: Tech | null,
  /**
   * 마스터에 등록된 대분류 id 목록.
   *
   * 대분류는 열거형이 아니라 데이터라 이 파일이 혼자 검증할 수 없다. 호출하는
   * 라우트가 저장소에서 읽어 넘긴다. 넘기지 않으면 검사를 건너뛰므로,
   * 관리자 API 는 반드시 넘겨야 한다 — 안 넘기면 임의 문자열이 들어와
   * 필터와 축 카드에서 사라지는 기술이 생긴다.
   */
  allowedDomains?: readonly string[],
): Tech {
  const raw = asRecord(input, '기술 정보');
  const business = asRecord(raw.business ?? {}, 'business');
  const io = asRecord(business.io ?? {}, 'business.io');
  const media = asRecord(raw.media ?? {}, 'media');
  const verification = asRecord(raw.verification ?? {}, 'verification');

  const name_ko = str(raw.name_ko);
  if (!name_ko) throw new InvalidInputError('기술명(한글)은 필수입니다.');

  const maturity = str(business.maturity);
  const now = new Date().toISOString();

  return {
    id: parseId(raw.id),
    name_ko,
    name_en: str(raw.name_en) || undefined,
    domain: allowedDomains ? pick(allowedDomains, raw.domain, '대분류') : str(raw.domain),
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
      cert_name: str(verification.cert_name) || undefined,
      cert_no: str(verification.cert_no) || undefined,
      valid_until: str(verification.valid_until) || undefined,
    },
    // 프리셋 id 또는 자유 문구. 목록에 없다고 거부하면 "커스텀" 같은
    // 구분을 만들 수 없다 — 비어 있지만 않으면 받는다.
    dev_type: (() => {
      const v = str(raw.dev_type);
      if (!v) throw new InvalidInputError('개발 구분을 입력해야 합니다.');
      return v;
    })(),
    base_model: str(raw.base_model) || undefined,
    demo: parseDemo(raw.demo),
    media: {
      thumbnail: mediaStr(media.thumbnail) || undefined,
      loop: mediaStr(media.loop) || undefined,
      video: mediaStr(media.video) || undefined,
      loop_webm: mediaStr(media.loop_webm) || undefined,
      video_webm: mediaStr(media.video_webm) || undefined,
      loop_poster: mediaStr(media.loop_poster) || undefined,
    },
    resources: parseResources(raw.resources),
    related_tech: strList(raw.related_tech),
    visibility: pick(VISIBILITIES, raw.visibility, '공개 범위'),
    restricted: raw.restricted === true,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : (existing?.order ?? 0),
    health: existing?.health,
    // 옛 id 목록은 관리자 입력이 아니라 저장소가 rename 시점에 쌓는다.
    previous_ids: existing?.previous_ids,
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
      thumbnail: mediaStr(media.thumbnail) || undefined,
      loop: mediaStr(media.loop) || undefined,
      video: mediaStr(media.video) || undefined,
      loop_webm: mediaStr(media.loop_webm) || undefined,
      video_webm: mediaStr(media.video_webm) || undefined,
    },
    visibility: pick(VISIBILITIES, raw.visibility, '공개 범위'),
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

/**
 * 관리자 입력 → 대분류 마스터.
 *
 * 축은 화면 구성을 좌우한다 — 랜딩의 축 카드, 카드의 색 점, 필터 칩이 전부
 * 여기서 나온다. 그래서 라벨만 받지 않고 카드에 들어갈 문구와 색까지 받는다.
 * 색은 자유 입력이 아니라 팔레트에서 고르게 해 채도 높은 색을 막는다.
 */
export function parseDomainInput(input: unknown, index: number): DomainDef {
  const raw = asRecord(input, `대분류 ${index + 1}`);

  const label = str(raw.label);
  if (!label) throw new InvalidInputError(`대분류 ${index + 1} 의 이름이 비어 있습니다.`);

  return {
    id: parseDomainId(raw.id),
    label,
    // 짧은 이름을 비워 두면 카드의 좁은 자리에서 줄이 넘친다. 비면 정식
    // 이름을 그대로 쓴다 — 빈 값보다는 넘치는 편이 낫다.
    short_label: str(raw.short_label) || label,
    lead: str(raw.lead),
    description: str(raw.description),
    accent: pick(ACCENTS, raw.accent, `대분류 "${label}" 의 색`),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
  };
}

/** 저장 전 전체 목록 검사. id 중복은 필터를 조용히 망가뜨리므로 여기서 막는다. */
export function parseDomainList(input: unknown): DomainDef[] {
  if (!Array.isArray(input)) throw new InvalidInputError('대분류 목록 형식이 올바르지 않습니다.');
  if (input.length === 0) {
    throw new InvalidInputError('대분류는 최소 1개가 있어야 합니다.');
  }

  const parsed = input.map(parseDomainInput);
  const seen = new Set<string>();
  for (const domain of parsed) {
    if (seen.has(domain.id)) {
      throw new InvalidInputError(`대분류 id 가 중복됩니다: ${domain.id}`);
    }
    seen.add(domain.id);
  }
  return parsed;
}
