import type { Tech } from './types';

export interface ValidationIssue {
  /** 폼에서 해당 입력으로 이동시키기 위한 필드 경로 */
  field: string;
  label: string;
  message: string;
}

/**
 * 발행 게이트.
 *
 * business 블록이 비어 있는 기술은 영업에 쓸 수 없는 카드가 되므로,
 * 등록 단계에서 막는 것이 이 시스템의 핵심 요구사항이다.
 * 관리자 폼과 서버 라우트가 같은 함수를 호출해 클라이언트 우회를 막는다.
 */
export function validateForPublish(tech: Tech): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const b = tech.business;

  if (!b.problem?.trim()) {
    issues.push({
      field: 'business.problem',
      label: '해결하는 문제',
      message: '방문자가 가장 먼저 보는 항목입니다. 반드시 입력해야 합니다.',
    });
  }

  /*
    산업군(마스터 id)을 요구한다. 전에는 자유 입력인 target_industries 만
    요구했는데, 그러면 산업군이 비어 있어도 발행이 되어 그 기술이 산업별
    화면과 필터 어디에도 걸리지 않는다. 기술-산업-제품을 한 쌍으로 잇는 값은
    이쪽이다.
  */
  if (!tech.industries || tech.industries.filter((s) => s.trim()).length === 0) {
    issues.push({
      field: 'industries',
      label: '산업군',
      message: '산업별 화면과 카탈로그 필터가 이 값으로 연결됩니다. 최소 1개 이상 골라야 합니다.',
    });
  }

  if (!b.io?.input?.trim()) {
    issues.push({
      field: 'business.io.input',
      label: '입력 형식',
      message: '도입 검토에 필요한 항목입니다.',
    });
  }

  if (!b.io?.output?.trim()) {
    issues.push({
      field: 'business.io.output',
      label: '출력 형식',
      message: '도입 검토에 필요한 항목입니다.',
    });
  }

  if (!b.maturity) {
    issues.push({
      field: 'business.maturity',
      label: '성숙도',
      message: '드롭다운에서 선택해야 합니다.',
    });
  }

  /**
   * 지표 자체의 완결성.
   *
   * 지표는 없어도 되지만, 있다면 판정에 필요한 값이 모두 있어야 한다.
   * 특히 direction 이 비면 달성 여부를 계산할 수 없다 — 이 검사가 없으면
   * 방향을 고르지 않은 지표를 넣고도 화면이 "발행 가능"으로 보인다.
   */
  tech.metrics.forEach((metric, index) => {
    const name = metric.label?.trim() ? `지표 "${metric.label.trim()}"` : `지표 ${index + 1}`;

    if (!metric.label?.trim()) {
      issues.push({
        field: `metrics.${index}.label`,
        label: `지표 ${index + 1} 지표명`,
        message: '지표명을 입력해야 합니다.',
      });
    }
    if (!metric.direction) {
      issues.push({
        field: `metrics.${index}.direction`,
        label: `${name} 방향`,
        message: '높을수록 좋음 / 낮을수록 좋음 중 하나를 골라야 달성 여부를 계산할 수 있습니다.',
      });
    }
    // 목표값은 선택 항목이다 — 인증 성적서에는 목표치가 없는 경우가 있다.
    if (!Number.isFinite(metric.value)) {
      issues.push({
        field: `metrics.${index}.value`,
        label: `${name} 달성값`,
        message: '달성값은 숫자여야 합니다.',
      });
    }
    if (metric.target !== undefined && !Number.isFinite(metric.target)) {
      issues.push({
        field: `metrics.${index}.value`,
        label: `${name} 목표값`,
        message: '목표값은 비우거나 숫자여야 합니다.',
      });
    }
  });

  // 샘플 없이 발행하면 방문자에게 파일 업로드를 먼저 요구하게 되어 이탈한다.
  if (tech.demo.type === 'api' && tech.demo.samples.length === 0) {
    issues.push({
      field: 'demo.samples',
      label: '데모 샘플 입력',
      message: 'api 데모는 미리 준비한 샘플이 최소 1개 필요합니다.',
    });
  }

  if (tech.demo.type === 'api' && !tech.demo.endpoint.trim()) {
    issues.push({
      field: 'demo.endpoint',
      label: '데모 엔드포인트',
      message: 'api 데모는 호출 주소가 필요합니다.',
    });
  }

  if (tech.demo.type === 'embed' && !tech.demo.embed_url.trim()) {
    issues.push({
      field: 'demo.embed_url',
      label: '웹앱 주소',
      message: 'embed 데모는 웹앱 주소가 필요합니다.',
    });
  }

  if (tech.demo.type === 'video' && !tech.demo.src.trim()) {
    issues.push({
      field: 'demo.src',
      label: '데모 영상',
      message: 'video 데모는 영상 파일이 필요합니다.',
    });
  }

  if (tech.demo.type === 'metric' && tech.metrics.length === 0) {
    issues.push({
      field: 'metrics',
      label: '성능 지표',
      message: 'metric 데모는 보여줄 지표가 최소 1개 필요합니다.',
    });
  }

  /*
   * 내부망 주소 보호.
   *
   * 관련 자료에 사내 위키 같은 내부망 주소가 들어올 수 있다. "내부 전용"을
   * 끄는 순간 그 주소가 공개 화면에 그대로 나가므로, 사설 대역 주소는 내부
   * 전용을 켜야만 발행되게 막는다. 실수 한 번이 내부망 구조를 밖에 알리는
   * 사고가 되는 자리다.
   */
  const PRIVATE_HOST =
    /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.)/i;
  tech.resources.forEach((resource) => {
    if (!resource.internal && PRIVATE_HOST.test(resource.url.trim())) {
      issues.push({
        field: 'resources',
        label: `관련 자료 "${resource.label || resource.url}" 내부 전용 표시`,
        message: '내부망 주소는 내부 전용으로 표시해야 외부 공개할 수 있습니다.',
      });
    }
  });

  return issues;
}

export function canPublish(tech: Tech): boolean {
  return validateForPublish(tech).length === 0;
}

/**
 * 발행을 막지는 않지만 관리자 목록에서 경고로 표시할 항목.
 * requirements 가 비면 "도입 정보 미비" 로 표시된다.
 */
export function collectWarnings(tech: Tech): string[] {
  const warnings: string[] = [];

  if (!tech.business.requirements || tech.business.requirements.filter((s) => s.trim()).length === 0) {
    warnings.push('도입 정보 미비');
  }
  if (tech.metrics.length > 0 && tech.metrics.some((m) => !m.dataset?.trim())) {
    warnings.push('평가 데이터셋 미기재');
  }
  if (!tech.media.thumbnail && !tech.media.loop && tech.metrics.length === 0) {
    warnings.push('썸네일·지표 모두 없음');
  }

  return warnings;
}
