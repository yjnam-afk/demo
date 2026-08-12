import type { CategoryStore, DomainDef, Health, Industry, Solution, Tech } from '@/lib/domain/types';
import type { Domain, OfferingKind, VerificationLevel } from '@/lib/domain/enums';
import { isExternallyVisible, isReachable } from '@/lib/domain/publicView';
import { summarizeAchievement } from '@/lib/domain/metric';
import { FALLBACK_ACCENT } from '@/lib/ui/domain';
import type { PublicSummary, TechPage, TechQuery, TechRepository } from './repository';
import { createStore } from './store';

/**
 * 저장 위치는 환경이 정한다 — Vercel 이면 Blob, 그 외에는 파일.
 * 아래 조회 로직은 어느 쪽인지 알지 못한다.
 */
const store = createStore();

const TECH = 'technologies';
const SOLUTION = 'solutions';
const CATEGORY = 'categories';
const INDUSTRY = 'industries';
const DOMAIN = 'domains';

const DEFAULT_LIMIT = 12;

/**
 * 쓰기 직렬화용 큐.
 * 관리자 화면의 동시 저장이 read-modify-write 사이에 끼어들어 갱신을 덮어쓰는 것을 막는다.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => undefined);
  return next;
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  return store.read(name, fallback);
}


async function writeJson(name: string, data: unknown): Promise<void> {
  return store.write(name, data);
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function matches(tech: Tech, query: TechQuery): boolean {
  if (query.domain && tech.domain !== query.domain) return false;

  if (query.categories?.length && !query.categories.includes(tech.category)) return false;

  if (query.verification?.length && !query.verification.includes(tech.verification.level)) {
    return false;
  }

  if (query.industries?.length) {
    if (!query.industries.some((id) => tech.industries.includes(id))) return false;
  }

  if (query.q) {
    const needle = normalize(query.q);
    const haystack = [tech.name_ko, tech.name_en ?? '', tech.summary, tech.category]
      .map(normalize)
      .join(' ');
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function paginate(items: Tech[], query: TechQuery): TechPage {
  const sorted = [...items].sort((a, b) => a.order - b.order || a.name_ko.localeCompare(b.name_ko));
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(1, query.limit ?? DEFAULT_LIMIT);
  const page = sorted.slice(offset, offset + limit);
  return { items: page, total: sorted.length, hasMore: offset + page.length < sorted.length };
}

export class JsonTechRepository implements TechRepository {
  private async allTech(): Promise<Tech[]> {
    return readJson<Tech[]>(TECH, []);
  }

  private async saveTech(list: Tech[]): Promise<void> {
    await writeJson(TECH, list);
  }

  async listPublic(query: TechQuery = {}): Promise<TechPage> {
    const all = await this.allTech();
    // 공개 여부를 필터가 아닌 조회 단계에서 처리한다.
    // 화면 쪽 필터로 미루면 새 화면을 추가할 때마다 누락 위험이 생긴다.
    const visible = all.filter(isExternallyVisible).filter((t) => matches(t, query));
    return paginate(visible, query);
  }

  async getPublic(id: string): Promise<Tech | null> {
    const all = await this.allTech();
    const found = all.find((t) => t.id === id);
    return found && isExternallyVisible(found) ? found : null;
  }

  /**
   * 주소로 직접 들어온 요청용 조회.
   *
   * 링크 공개까지 포함한다. getPublic 과 나눠 두는 이유는 이 결과가 목록에
   * 섞이면 안 되기 때문이다 — 연계 기술이나 제품 구성이 이 함수를 쓰면
   * "아는 사람만" 이 무너진다. 그쪽은 getPublic 을 그대로 둔다.
   */
  async getShareable(id: string): Promise<Tech | null> {
    const all = await this.allTech();
    const found = all.find((t) => t.id === id);
    return found && isReachable(found) ? found : null;
  }

  async listAll(query: TechQuery = {}): Promise<TechPage> {
    const all = await this.allTech();
    const filtered = all.filter((t) => matches(t, query));
    return paginate(filtered, { ...query, limit: query.limit ?? 500 });
  }

  async get(id: string): Promise<Tech | null> {
    const all = await this.allTech();
    return all.find((t) => t.id === id) ?? null;
  }

  async create(tech: Tech): Promise<Tech> {
    return serialized(async () => {
      const all = await this.allTech();
      if (all.some((t) => t.id === tech.id)) {
        throw new Error(`이미 존재하는 기술 id 입니다: ${tech.id}`);
      }
      all.push(tech);
      await this.saveTech(all);
      return tech;
    });
  }

  async update(id: string, patch: Partial<Tech>): Promise<Tech> {
    return serialized(async () => {
      const all = await this.allTech();
      const index = all.findIndex((t) => t.id === id);
      if (index === -1) throw new Error(`기술을 찾을 수 없습니다: ${id}`);
      const updated: Tech = { ...all[index], ...patch, id, updated_at: new Date().toISOString() };
      all[index] = updated;
      await this.saveTech(all);
      return updated;
    });
  }

  /**
   * 기술 id 변경.
   *
   * id 는 URL 이자 다른 데이터가 이 기술을 가리키는 열쇠다. 값만 바꾸면
   * 제품의 구성 기술과 연계 기술이 존재하지 않는 id 를 가리키게 되어
   * 화면에서 조용히 사라진다. 그래서 참조를 같은 쓰기 안에서 함께 옮긴다.
   *
   * 옛 id 는 버리지 않고 previous_ids 에 쌓는다 — 이미 나간 링크를 살린다.
   */
  async rename(oldId: string, newId: string): Promise<Tech> {
    return serialized(async () => {
      const all = await this.allTech();
      const target = all.find((t) => t.id === oldId);
      if (!target) throw new Error(`기술을 찾을 수 없습니다: ${oldId}`);

      if (all.some((t) => t.id === newId)) {
        throw new Error(`이미 존재하는 기술 id 입니다: ${newId}`);
      }
      // 다른 기술이 쓰던 옛 id 를 가져가면 그 기술의 옛 링크가 엉뚱한 곳으로
      // 넘어간다. 링크가 깨지는 것보다 나쁘다.
      const heldBy = all.find((t) => t.id !== oldId && t.previous_ids?.includes(newId));
      if (heldBy) {
        throw new Error(`"${heldBy.name_ko}" 이(가) 예전에 쓰던 id 입니다: ${newId}`);
      }

      const history = [...(target.previous_ids ?? []), oldId].filter((v) => v !== newId);
      target.id = newId;
      target.previous_ids = [...new Set(history)];
      target.updated_at = new Date().toISOString();

      // 다른 기술의 연계 목록
      for (const tech of all) {
        if (tech.related_tech.includes(oldId)) {
          tech.related_tech = tech.related_tech.map((v) => (v === oldId ? newId : v));
        }
      }
      await this.saveTech(all);

      // 제품·구성의 구성 기술
      const solutions = await readJson<Solution[]>(SOLUTION, []);
      let touched = false;
      for (const solution of solutions) {
        for (const step of solution.steps) {
          if (step.tech_id === oldId) {
            step.tech_id = newId;
            touched = true;
          }
        }
      }
      if (touched) await writeJson(SOLUTION, solutions);

      return target;
    });
  }

  /** 옛 id 로 들어온 요청을 현재 기술로 잇는다. 상세 화면이 현재 주소로 넘긴다. */
  async findByPreviousId(id: string): Promise<Tech | null> {
    const all = await this.allTech();
    return all.find((t) => t.previous_ids?.includes(id)) ?? null;
  }

  async remove(id: string): Promise<void> {
    return serialized(async () => {
      const all = await this.allTech();
      await this.saveTech(all.filter((t) => t.id !== id));
    });
  }

  async reorder(ids: string[]): Promise<void> {
    return serialized(async () => {
      const all = await this.allTech();
      const rank = new Map(ids.map((id, i) => [id, i]));
      for (const tech of all) {
        const next = rank.get(tech.id);
        if (next !== undefined) tech.order = next;
      }
      await this.saveTech(all);
    });
  }

  async saveHealth(id: string, health: Health): Promise<void> {
    return serialized(async () => {
      const all = await this.allTech();
      const target = all.find((t) => t.id === id);
      if (!target) return;
      target.health = health;
      await this.saveTech(all);
    });
  }

  async publicSummary(): Promise<PublicSummary> {
    const all = (await this.allTech()).filter(isExternallyVisible);

    // 마스터에 있는 축은 0건이어도 키를 만들어 둔다. 그래야 새로 만든 축이
    // 기술을 붙이기 전에도 랜딩의 축 카드에 나타난다.
    const domainCounts: Record<string, number> = {};
    for (const def of await this.listDomains()) domainCounts[def.id] = 0;
    const certifiers = new Set<string>();

    for (const tech of all) {
      domainCounts[tech.domain] = (domainCounts[tech.domain] ?? 0) + 1;
      if (tech.verification.level === 'third_party' && tech.verification.body) {
        certifiers.add(tech.verification.body);
      }
    }

    return {
      techCount: all.length,
      thirdPartyCount: all.filter((t) => t.verification.level === 'third_party').length,
      // 대외 제한 기술의 지표는 화면에 나가지 않는다. 여기서 세면 어디에도
      // 보이지 않는 숫자가 합계에 섞인다.
      metrics: summarizeAchievement(all.filter((t) => !t.restricted).map((t) => t.metrics)),
      provenCount: all.filter(
        (t) => t.business.maturity === 'field_proven' || t.business.maturity === 'pilot_done',
      ).length,
      certifiers: [...certifiers].sort((a, b) => a.localeCompare(b)),
      domainCounts,
    };
  }

  async publicFacets(query: TechQuery = {}) {
    const all = (await this.allTech()).filter(isExternallyVisible);
    const industryLabels = new Map((await this.listIndustries()).map((i) => [i.id, i.label]));
    // 필터 칩도 라벨과 색이 필요하다. 화면이 마스터를 다시 조회하지 않도록
    // 산업군과 같은 방식으로 여기서 붙여 보낸다.
    const domainDefs = await this.listDomains();

    /*
      칩의 숫자는 "이 칩을 누르면 몇 건이 남는가" 다. 전체 기준으로 세면
      필터를 거는 순간부터 화면의 건수와 어긋난다. 그래서 차원마다 자기
      차원의 선택만 빼고 나머지 필터를 적용한 목록에서 센다. 카테고리는
      대분류의 하위라, 대분류를 셀 때는 카테고리 선택도 함께 뺀다.
    */
    const forDomains = all.filter((t) => matches(t, { ...query, domain: undefined, categories: undefined }));
    const forCategories = all.filter((t) => matches(t, { ...query, categories: undefined }));
    const forIndustries = all.filter((t) => matches(t, { ...query, industries: undefined }));

    const categories = new Map<string, { domain: Domain; count: number }>();
    for (const tech of forCategories) {
      const entry = categories.get(tech.category);
      categories.set(tech.category, { domain: tech.domain, count: (entry?.count ?? 0) + 1 });
    }

    const industries = new Map<string, number>();
    for (const tech of forIndustries) {
      // 산업군 집계는 마스터 id 를 쓰는 tech.industries 만 센다.
      // target_industries 는 "공항·항만" 같은 자유 서술이라 필터 값으로 섞으면
      // 선택지가 무한히 늘어난다.
      for (const industry of new Set(tech.industries)) {
        industries.set(industry, (industries.get(industry) ?? 0) + 1);
      }
    }

    return {
      // 탭 순서는 마스터의 순서다. 공개 기술이 하나도 없는 축은 싣지 않되,
      // 다른 필터 때문에 0 이 된 축은 0 으로라도 세운다 — 탭이 사라졌다
      // 나타나면 화면이 흔들린다.
      domains: domainDefs
        .filter((d) => all.some((t) => t.domain === d.id))
        .map((d) => ({
          value: d.id,
          label: d.label,
          short_label: d.short_label,
          accent: d.accent,
          count: forDomains.filter((t) => t.domain === d.id).length,
        })),
      categories: [...categories].map(([value, meta]) => ({ value, ...meta })),
      industries: [...industries]
        .map(([value, count]) => ({ value, label: industryLabels.get(value) ?? value, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    };
  }

  async listCategories(): Promise<CategoryStore> {
    return readJson<CategoryStore>(CATEGORY, {});
  }

  async addCategory(domain: Domain, name: string): Promise<CategoryStore> {
    return serialized(async () => {
      const store = await this.listCategories();
      const trimmed = name.trim();
      // 새로 만든 축에는 아직 키가 없다. 첫 카테고리를 넣을 때 만들어 준다.
      const list = store[domain] ?? [];
      if (trimmed && !list.includes(trimmed)) {
        store[domain] = [...list, trimmed].sort((a, b) => a.localeCompare(b));
        await writeJson(CATEGORY, store);
      }
      return store;
    });
  }

  async listDomains(): Promise<DomainDef[]> {
    const all = await readJson<DomainDef[]>(DOMAIN, []);
    return [...all].sort((a, b) => a.order - b.order);
  }

  async saveDomains(next: DomainDef[]): Promise<DomainDef[]> {
    return serialized(async () => {
      const ordered = next.map((domain, index) => ({ ...domain, order: index }));
      await writeJson(DOMAIN, ordered);
      return ordered;
    });
  }

  /**
   * 축 삭제.
   *
   * 사용 중인 축을 지우면 그 기술들이 필터에서도 축 카드에서도 사라져
   * 관리자에게만 보이지 않는 유령이 된다. 그래서 쓰는 기술이 하나라도
   * 있으면 막고, 몇 건이 걸려 있는지 알려 준다.
   */
  async removeDomain(id: string): Promise<{ removed: boolean; usedBy: number }> {
    return serialized(async () => {
      const usedBy = (await this.allTech()).filter((tech) => tech.domain === id).length;
      if (usedBy > 0) return { removed: false, usedBy };

      const all = await readJson<DomainDef[]>(DOMAIN, []);
      const next = all
        .filter((domain) => domain.id !== id)
        .map((domain, index) => ({ ...domain, order: index }));
      await writeJson(DOMAIN, next);

      // 카테고리 마스터에 남은 빈 키도 함께 정리한다.
      const store = await this.listCategories();
      if (id in store) {
        delete store[id];
        await writeJson(CATEGORY, store);
      }
      return { removed: true, usedBy: 0 };
    });
  }

  async listIndustries(): Promise<Industry[]> {
    return readJson<Industry[]>(INDUSTRY, []);
  }

  async addIndustry(label: string, description?: string): Promise<Industry[]> {
    return serialized(async () => {
      const all = await this.listIndustries();
      const trimmed = label.trim();
      if (!trimmed) return all;

      // 라벨에서 id 를 만든다. 한글은 슬러그로 못 바꾸므로 순번을 붙인다.
      const base = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const id = base || `industry-${all.length + 1}`;

      if (all.some((item) => item.id === id || item.label === trimmed)) return all;

      const next = [...all, { id, label: trimmed, description: description?.trim() || undefined }];
      await writeJson(INDUSTRY, next);
      return next;
    });
  }

  async listSolutions(
    opts: { publishedOnly?: boolean; kind?: OfferingKind } = {},
  ): Promise<Solution[]> {
    const all = await readJson<Solution[]>(SOLUTION, []);
    return all
      .filter((s) => (opts.publishedOnly ? s.visibility === 'public' : true))
      .filter((s) => (opts.kind ? s.kind === opts.kind : true))
      .sort((a, b) => a.order - b.order);
  }

  async getSolution(id: string): Promise<Solution | null> {
    const all = await this.listSolutions();
    return all.find((s) => s.id === id) ?? null;
  }

  async upsertSolution(solution: Solution): Promise<Solution> {
    return serialized(async () => {
      const all = await readJson<Solution[]>(SOLUTION, []);
      const index = all.findIndex((s) => s.id === solution.id);
      const next = { ...solution, updated_at: new Date().toISOString() };
      if (index === -1) all.push(next);
      else all[index] = next;
      await writeJson(SOLUTION, all);
      return next;
    });
  }

  async removeSolution(id: string): Promise<void> {
    return serialized(async () => {
      const all = await readJson<Solution[]>(SOLUTION, []);
      await writeJson(
        SOLUTION,
        all.filter((s) => s.id !== id),
      );
    });
  }
}
