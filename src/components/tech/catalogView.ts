/**
 * 카탈로그 보기 기준 정의.
 *
 * 전환 조작은 GNB(MainNav)가 담당하고, 이 파일은 기준의 목록과 라벨만 갖는다.
 * 화면 여러 곳이 같은 기준 목록을 쓰므로 정의를 한곳에 모은다.
 */
export const CATALOG_VIEWS = ['product', 'tech', 'industry'] as const;
export type CatalogView = (typeof CATALOG_VIEWS)[number];

/** 메뉴에 쓰는 짧은 이름 */
export const VIEW_LABELS: Record<CatalogView, string> = {
  product: '제품',
  tech: '기술',
  industry: '산업',
};

/** 본문 머리에 쓰는 제목 */
export const VIEW_TITLES: Record<CatalogView, string> = {
  product: '제품',
  tech: '보유 기술',
  industry: '산업별 적용',
};

/**
 * 제목 아래 한 줄.
 * 화면 조작을 설명하지 않는다 — 방문자는 "이 목록이 무엇인가"를 알고 싶지
 * "지금 어떤 보기 모드인가"를 궁금해하지 않는다.
 */
export const VIEW_HINTS: Record<CatalogView, string> = {
  product: '현장에 즉시 적용 가능한 제품입니다.',
  tech: '제품을 구성하는 요소 기술입니다.',
  industry: '산업별 적용 구성과 사례입니다.',
};

export function isCatalogView(value: unknown): value is CatalogView {
  return typeof value === 'string' && (CATALOG_VIEWS as readonly string[]).includes(value);
}
