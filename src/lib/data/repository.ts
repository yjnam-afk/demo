import type { CategoryStore, Health, Solution, Tech } from '@/lib/domain/types';
import type { Domain, VerificationLevel } from '@/lib/domain/enums';

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

  /** 관리자용 — draft 와 비공개 기술을 포함한 전체 조회. */
  listAll(query?: TechQuery): Promise<TechPage>;
  get(id: string): Promise<Tech | null>;

  create(tech: Tech): Promise<Tech>;
  update(id: string, patch: Partial<Tech>): Promise<Tech>;
  remove(id: string): Promise<void>;
  /** id 배열 순서대로 order 를 다시 매긴다. */
  reorder(ids: string[]): Promise<void>;
  saveHealth(id: string, health: Health): Promise<void>;

  /** 공개 화면의 필터 선택지를 실제 데이터에서 뽑아낸다. */
  publicFacets(): Promise<{
    domains: { value: Domain; count: number }[];
    categories: { value: string; domain: Domain; count: number }[];
    verification: { value: VerificationLevel; count: number }[];
    industries: { value: string; count: number }[];
  }>;

  listCategories(): Promise<CategoryStore>;
  addCategory(domain: Domain, name: string): Promise<CategoryStore>;

  listSolutions(opts?: { publishedOnly?: boolean }): Promise<Solution[]>;
  getSolution(id: string): Promise<Solution | null>;
  upsertSolution(solution: Solution): Promise<Solution>;
  removeSolution(id: string): Promise<void>;
}
