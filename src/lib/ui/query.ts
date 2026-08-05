import { VERIFICATION_LEVELS, isOneOf } from '@/lib/domain/enums';
import type { TechQuery } from '@/lib/data/repository';

export const PAGE_SIZE = 12;

/** URL 질의 문자열 → 저장소 질의. 화면과 API 라우트가 같은 해석을 공유한다. */
export function parseTechQuery(params: URLSearchParams): TechQuery {
  const domain = params.get('domain');
  const categories = params.getAll('category').filter(Boolean);
  const verification = params.getAll('verification').filter((v) => isOneOf(VERIFICATION_LEVELS, v));
  const industries = params.getAll('industry').filter(Boolean);
  const q = params.get('q')?.trim() || undefined;
  const offset = Number.parseInt(params.get('offset') ?? '0', 10);
  const limit = Number.parseInt(params.get('limit') ?? String(PAGE_SIZE), 10);

  return {
    // 대분류는 마스터가 데이터라 여기서 화이트리스트로 거를 수 없다.
    // 없는 id 가 들어오면 저장소가 0건을 돌려주므로 빈 목록이 될 뿐,
    // 값이 다른 필터로 새지는 않는다.
    domain: domain?.trim() || undefined,
    categories: categories.length ? categories : undefined,
    verification: verification.length ? verification : undefined,
    industries: industries.length ? industries : undefined,
    q,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 60) : PAGE_SIZE,
  };
}

/** Next.js 의 searchParams 객체를 URLSearchParams 로 정규화한다. */
export function toSearchParams(
  input: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, value);
  }
  return params;
}

/** 다중 선택 필터의 값을 켜고 끈 새 URL 을 만든다. */
export function toggledHref(
  base: URLSearchParams,
  key: string,
  value: string,
  options: { single?: boolean } = {},
): string {
  const next = new URLSearchParams(base);
  const current = next.getAll(key);

  next.delete(key);
  if (options.single) {
    if (!current.includes(value)) next.set(key, value);
  } else {
    const remaining = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    remaining.forEach((v) => next.append(key, v));
  }

  // 필터가 바뀌면 처음부터 다시 본다.
  next.delete('offset');

  const qs = next.toString();
  return qs ? `/tech?${qs}` : '/tech';
}

export function isActive(params: URLSearchParams, key: string, value: string): boolean {
  return params.getAll(key).includes(value);
}
