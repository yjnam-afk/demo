/**
 * 카탈로그 보기 기준 정의.
 *
 * 전환 조작은 GNB(MainNav)가 담당하고, 이 파일은 기준의 목록과 라벨만 갖는다.
 * 화면 여러 곳이 같은 기준 목록을 쓰므로 정의를 한곳에 모은다.
 */
/**
 * 순서가 곧 GNB 순서이자 우선순위다: 기술 → 산업 → 제품.
 *
 * 기술이 맨 앞이다 — 이 사이트가 소개하는 대상이다.
 * 제품이 맨 뒤인 것은 덜 중요해서가 아니라, 회사 공식 사이트가 이미 제품
 * 중심으로 설명하고 있기 때문이다. 여기서까지 제품을 앞세우면 같은 이야기를
 * 두 번 하게 되고, 이 포털이 따로 있을 이유가 없어진다.
 */
export const CATALOG_VIEWS = ['tech', 'industry', 'product'] as const;
export type CatalogView = (typeof CATALOG_VIEWS)[number];

/** 아무것도 지정하지 않았을 때 열리는 기준 */
export const DEFAULT_VIEW: CatalogView = 'tech';

/**
 * 메뉴에 쓰는 짧은 이름.
 *
 * "제품 / 기술 / 산업" 으로 두면 서로 다른 것을 파는 세 개의 화면으로 읽힌다.
 * 셋은 같은 기술 목록을 다르게 묶은 것뿐이므로 "~별" 을 붙여 묶는 기준임을
 * 드러낸다. 이 사이트가 소개하는 대상은 언제나 기술이다.
 */
export const VIEW_LABELS: Record<CatalogView, string> = {
  tech: '기술',
  industry: '산업별',
  product: '제품별',
};

/** 본문 머리에 쓰는 제목 */
export const VIEW_TITLES: Record<CatalogView, string> = {
  tech: '보유 기술',
  industry: '산업에 적용된 기술',
  product: '제품에 적용된 기술',
};

/** 제목 위에 붙는 짧은 분류 표시 */
export const VIEW_EYEBROWS: Record<CatalogView, string> = {
  tech: '기술',
  industry: '산업',
  product: '제품',
};

export function isCatalogView(value: unknown): value is CatalogView {
  return typeof value === 'string' && (CATALOG_VIEWS as readonly string[]).includes(value);
}
