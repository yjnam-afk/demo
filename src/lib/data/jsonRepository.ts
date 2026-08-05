import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CategoryStore, Health, Solution, Tech } from '@/lib/domain/types';
import type { Domain, VerificationLevel } from '@/lib/domain/enums';
import { isExternallyVisible } from '@/lib/domain/publicView';
import { summarizeAchievement } from '@/lib/domain/metric';
import type { PublicSummary, TechPage, TechQuery, TechRepository } from './repository';

const DATA_DIR = path.join(process.cwd(), 'data');
const TECH_FILE = path.join(DATA_DIR, 'technologies.json');
const SOLUTION_FILE = path.join(DATA_DIR, 'solutions.json');
const CATEGORY_FILE = path.join(DATA_DIR, 'categories.json');

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

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

/**
 * 저장소가 읽기 전용일 때 나는 오류.
 *
 * 서버리스 환경(Vercel 등)은 배포 산출물이 읽기 전용이라 파일 기반 저장이
 * 통하지 않는다. 원인 모를 500 대신 무엇이 문제인지 알려 준다.
 */
export class ReadOnlyStoreError extends Error {
  constructor() {
    super(
      '이 환경에서는 데이터를 저장할 수 없습니다. 파일 기반 저장소는 쓰기 가능한 디스크가 필요합니다 — 사내 서버 배포에서 사용하거나 DB 저장소로 전환하세요.',
    );
    this.name = 'ReadOnlyStoreError';
  }
}

/** 임시 파일에 쓰고 rename 으로 교체한다. 쓰기 도중 중단되어도 원본이 깨지지 않는다. */
async function writeJson(file: string, data: unknown): Promise<void> {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.rename(tmp, file);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM') {
      throw new ReadOnlyStoreError();
    }
    throw err;
  }
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
    const pool = new Set([...tech.industries, ...(tech.business.target_industries ?? [])]);
    if (!query.industries.some((i) => pool.has(i))) return false;
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
    return readJson<Tech[]>(TECH_FILE, []);
  }

  private async saveTech(list: Tech[]): Promise<void> {
    await writeJson(TECH_FILE, list);
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

    const domainCounts: Record<Domain, number> = { ai: 0, digital_twin: 0, spatial: 0 };
    const certifiers = new Set<string>();

    for (const tech of all) {
      domainCounts[tech.domain] += 1;
      if (tech.verification.level === 'third_party' && tech.verification.body) {
        certifiers.add(tech.verification.body);
      }
    }

    return {
      techCount: all.length,
      thirdPartyCount: all.filter((t) => t.verification.level === 'third_party').length,
      metrics: summarizeAchievement(all.map((t) => t.metrics)),
      provenCount: all.filter(
        (t) => t.business.maturity === 'field_proven' || t.business.maturity === 'pilot_done',
      ).length,
      certifiers: [...certifiers].sort((a, b) => a.localeCompare(b)),
      domainCounts,
    };
  }

  async publicFacets() {
    const all = (await this.allTech()).filter(isExternallyVisible);

    const domains = new Map<Domain, number>();
    const categories = new Map<string, { domain: Domain; count: number }>();
    const verification = new Map<VerificationLevel, number>();
    const industries = new Map<string, number>();

    for (const tech of all) {
      domains.set(tech.domain, (domains.get(tech.domain) ?? 0) + 1);

      const catEntry = categories.get(tech.category);
      categories.set(tech.category, {
        domain: tech.domain,
        count: (catEntry?.count ?? 0) + 1,
      });

      verification.set(tech.verification.level, (verification.get(tech.verification.level) ?? 0) + 1);

      for (const industry of new Set([
        ...tech.industries,
        ...(tech.business.target_industries ?? []),
      ])) {
        industries.set(industry, (industries.get(industry) ?? 0) + 1);
      }
    }

    return {
      domains: [...domains].map(([value, count]) => ({ value, count })),
      categories: [...categories].map(([value, meta]) => ({ value, ...meta })),
      verification: [...verification].map(([value, count]) => ({ value, count })),
      industries: [...industries]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    };
  }

  async listCategories(): Promise<CategoryStore> {
    return readJson<CategoryStore>(CATEGORY_FILE, { ai: [], digital_twin: [], spatial: [] });
  }

  async addCategory(domain: Domain, name: string): Promise<CategoryStore> {
    return serialized(async () => {
      const store = await this.listCategories();
      const trimmed = name.trim();
      if (trimmed && !store[domain].includes(trimmed)) {
        store[domain] = [...store[domain], trimmed].sort((a, b) => a.localeCompare(b));
        await writeJson(CATEGORY_FILE, store);
      }
      return store;
    });
  }

  async listSolutions(opts: { publishedOnly?: boolean } = {}): Promise<Solution[]> {
    const all = await readJson<Solution[]>(SOLUTION_FILE, []);
    const filtered = opts.publishedOnly ? all.filter((s) => s.status === 'published') : all;
    return filtered.sort((a, b) => a.order - b.order);
  }

  async getSolution(id: string): Promise<Solution | null> {
    const all = await this.listSolutions();
    return all.find((s) => s.id === id) ?? null;
  }

  async upsertSolution(solution: Solution): Promise<Solution> {
    return serialized(async () => {
      const all = await readJson<Solution[]>(SOLUTION_FILE, []);
      const index = all.findIndex((s) => s.id === solution.id);
      const next = { ...solution, updated_at: new Date().toISOString() };
      if (index === -1) all.push(next);
      else all[index] = next;
      await writeJson(SOLUTION_FILE, all);
      return next;
    });
  }

  async removeSolution(id: string): Promise<void> {
    return serialized(async () => {
      const all = await readJson<Solution[]>(SOLUTION_FILE, []);
      await writeJson(
        SOLUTION_FILE,
        all.filter((s) => s.id !== id),
      );
    });
  }
}
