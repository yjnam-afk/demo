import type { CategoryStore, DomainDef, Health, Industry, Solution, Tech } from '@/lib/domain/types';
import type { Accent, Domain, OfferingKind, VerificationLevel } from '@/lib/domain/enums';

export interface TechQuery {
  domain?: Domain;
  categories?: string[];
  verification?: VerificationLevel[];
  industries?: string[];
  /** 기술명·요약 부분 일치 */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface PublicSummary {
  /** 외부 공개 기술 수 */
  techCount: number;
  /** 제3자 인증 보유 기술 수 */
  thirdPartyCount: number;
  /** 정량 목표 달성 현황 */
  metrics: { total: number; achieved: number };
  /** 현장 적용 또는 실증을 마친 기술 수 */
  provenCount: number;
  /** 인증 기관명 목록 (KISA, TTA 등) */
  certifiers: string[];
  domainCounts: Record<string, number>;
}

export interface TechPage {
  items: Tech[];
  /** 필터를 만족하는 전체 건수 (페이지 크기와 무관) */
  total: number;
  /** 더 불러올 항목이 남아 있는지 */
  hasMore: boolean;
}

/**
 * 데이터 접근 인터페이스.
 *
 * 페이지와 라우트는 이 인터페이스만 사용한다. JSON 파일을 직접 읽는 코드는
 * jsonRepository 한 곳에만 존재하므로, DB 전환은 이 인터페이스의 새 구현을
 * 작성하고 getRepo() 가 그것을 반환하도록 바꾸는 것으로 끝난다.
 */
export interface TechRepository {
  /** 외부 공개 대상만 조회한다 (published + visibility.external). */
  listPublic(query?: TechQuery): Promise<TechPage>;
  getPublic(id: string): Promise<Tech | null>;
  /** 링크 공개까지 포함해 주소로 닿을 수 있는 기술을 조회한다. 목록에는 쓰지 않는다. */
  getShareable(id: string): Promise<Tech | null>;

  /** 관리자용 — draft 와 비공개 기술을 포함한 전체 조회. */
  listAll(query?: TechQuery): Promise<TechPage>;
  get(id: string): Promise<Tech | null>;

  create(tech: Tech): Promise<Tech>;
  update(id: string, patch: Partial<Tech>): Promise<Tech>;
  remove(id: string): Promise<void>;
  /** id 변경. 제품의 구성 기술과 연계 기술 참조를 함께 옮긴다. */
  rename(oldId: string, newId: string): Promise<Tech>;
  /** 옛 id 로 들어온 요청을 현재 기술로 잇는다. */
  findByPreviousId(id: string): Promise<Tech | null>;
  /** id 배열 순서대로 order 를 다시 매긴다. */
  reorder(ids: string[]): Promise<void>;
  saveHealth(id: string, health: Health): Promise<void>;

  /**
   * 신뢰 지표 요약. 랜딩과 카탈로그 상단이 같은 값을 쓴다.
   * 화면에서 전체 목록을 훑어 세지 않는 것은 DB 전환 시 집계 질의로
   * 바로 바꿀 수 있게 하기 위해서다.
   */
  publicSummary(): Promise<PublicSummary>;

  /** 공개 화면의 필터 선택지를 실제 데이터에서 뽑아낸다.
      query 를 주면 칩 숫자를 "그 칩을 누르면 몇 건이 남는가" 로 센다. */
  publicFacets(query?: TechQuery): Promise<{
    domains: {
      value: string;
      label: string;
      short_label: string;
      accent: Accent;
      count: number;
    }[];
    categories: { value: string; domain: Domain; count: number }[];
    industries: { value: string; label: string; count: number }[];
  }>;

  listCategories(): Promise<CategoryStore>;
  addCategory(domain: Domain, name: string): Promise<CategoryStore>;

  /** 대분류 마스터. 관리자 입력을 이 목록으로 제한한다. */
  listDomains(): Promise<DomainDef[]>;
  /** 전체 목록을 통째로 저장한다. 배열 순서가 그대로 표시 순서가 된다. */
  saveDomains(next: DomainDef[]): Promise<DomainDef[]>;
  /** 사용 중인 축은 지우지 않는다. removed:false 와 걸린 건수를 돌려준다. */
  removeDomain(id: string): Promise<{ removed: boolean; usedBy: number }>;

  listIndustries(): Promise<Industry[]>;
  addIndustry(label: string, description?: string): Promise<Industry[]>;

  listSolutions(opts?: { publishedOnly?: boolean; kind?: OfferingKind }): Promise<Solution[]>;
  getSolution(id: string): Promise<Solution | null>;
  upsertSolution(solution: Solution): Promise<Solution>;
  removeSolution(id: string): Promise<void>;
}
