import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * 문서 저장소.
 *
 * 이 사이트의 데이터는 JSON 문서 다섯 개가 전부다(기술·제품·대분류·산업군·
 * 카테고리). 저장소가 하는 일은 문서 하나를 통째로 읽고 통째로 쓰는 것뿐이라,
 * 저장 위치만 갈아 끼우면 어디서든 돌아간다.
 *
 * 두 구현을 둔다.
 *   FileStore  개발 환경과 사내 서버. data/ 디렉터리에 그대로 쓴다.
 *   BlobStore  Vercel. 배포 산출물이 읽기 전용이라 파일에 못 쓴다.
 *
 * 조회 로직(JsonTechRepository)은 둘을 구분하지 않는다.
 */
export interface DocumentStore {
  /** 이름은 'technologies' 처럼 확장자 없는 문서 키다. */
  read<T>(name: string, fallback: T): Promise<T>;
  write(name: string, data: unknown): Promise<void>;
  /** 화면에 표시할 저장소 종류 */
  readonly kind: 'file' | 'blob';
}

/**
 * 저장소가 읽기 전용일 때 나는 오류.
 * 원인 모를 500 대신 무엇이 문제인지 알려 준다.
 */
export class ReadOnlyStoreError extends Error {
  constructor() {
    super(
      '이 환경에서는 데이터를 저장할 수 없습니다. 파일 기반 저장소는 쓰기 가능한 디스크가 필요합니다 — 사내 서버 배포에서 사용하거나 Blob 저장소를 연결하세요.',
    );
    this.name = 'ReadOnlyStoreError';
  }
}

const DATA_DIR = path.join(process.cwd(), 'data');
const filePath = (name: string) => path.join(DATA_DIR, `${name}.json`);

/**
 * Blob 토큰이 들어 있는 환경 변수 이름.
 *
 * 기본 이름만 보면 안 된다. Vercel 에서 Blob 저장소를 연결할 때 환경 변수
 * 접두어를 지정할 수 있고(여러 저장소를 한 프로젝트에 붙이는 경우), 그러면
 * 이름이 BLOB_READ_WRITE_TOKEN 이 아니라 <접두어>_READ_WRITE_TOKEN 이 된다.
 * 연결은 됐는데 화면은 계속 "읽기 전용" 이라고 하는 상황이 여기서 나온다.
 *
 * 이름을 돌려주는 이유는 관리 화면에 어느 변수를 잡았는지 밝히기 위해서다.
 * 값은 절대 화면에 내보내지 않는다.
 */
export function blobTokenName(): string | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'BLOB_READ_WRITE_TOKEN';
  return (
    Object.keys(process.env).find(
      (name) => name.endsWith('_READ_WRITE_TOKEN') && process.env[name],
    ) ?? null
  );
}

function blobToken(): string | undefined {
  const name = blobTokenName();
  return name ? process.env[name] : undefined;
}

export class FileStore implements DocumentStore {
  readonly kind = 'file' as const;

  async read<T>(name: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await fs.readFile(filePath(name), 'utf8')) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
      throw err;
    }
  }

  /** 임시 파일에 쓰고 rename 으로 교체한다. 쓰기 도중 중단되어도 원본이 깨지지 않는다. */
  async write(name: string, data: unknown): Promise<void> {
    const file = filePath(name);
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
}

/**
 * Vercel Blob 저장소.
 *
 * 아직 한 번도 저장한 적 없는 문서는 Blob 에 없다. 그때는 배포에 포함된
 * data/*.json 을 읽어 화면이 처음부터 정상으로 뜨게 하고, 첫 저장부터
 * Blob 에 쌓인다. 그래서 연결만 하면 기존 데이터가 그대로 보인다.
 *
 * 읽기는 매번 네트워크를 타므로 아주 짧게 캐시한다. 관리자가 저장하면
 * 같은 인스턴스의 캐시는 즉시 버린다. 다른 인스턴스는 TTL 만큼 늦게
 * 따라오는데, 관리 화면에서 몇 초 늦는 것은 문제가 되지 않는다.
 */
const CACHE_TTL_MS = 5_000;

/**
 * Blob 호출 제한 시간.
 *
 * 없으면 저장소가 응답하지 않을 때 페이지 렌더가 통째로 매달린다. 읽기는
 * 실패해도 배포본으로 대체할 수 있으므로, 오래 기다리느니 빨리 포기하는
 * 편이 낫다.
 */
const READ_TIMEOUT_MS = 3_000;

/**
 * 한 번 실패하면 잠시 Blob 을 건너뛴다.
 *
 * 저장소가 죽었을 때 문서마다 제한 시간을 다 기다리면 화면 한 장에 그 배수가
 * 걸린다(문서 3개면 9초). 한 번 실패했다면 다음 요청도 실패할 가능성이 크므로,
 * 잠깐은 묻지 않고 배포본을 바로 쓴다.
 */
const DEGRADED_MS = 30_000;
const WRITE_TIMEOUT_MS = 10_000;

function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} 시간 초과 (${ms}ms)`)), ms),
    ),
  ]);
}

export class BlobStore implements DocumentStore {
  readonly kind = 'blob' as const;
  private readonly fallbackStore = new FileStore();
  private cache = new Map<string, { at: number; value: unknown }>();
  private degradedUntil = 0;

  private key(name: string) {
    return `data/${name}.json`;
  }

  async read<T>(name: string, fallback: T): Promise<T> {
    const hit = this.cache.get(name);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;

    // 방금 실패했다면 묻지 않는다.
    if (Date.now() < this.degradedUntil) return this.fallbackStore.read(name, fallback);

    const { list } = await import('@vercel/blob');
    let value: T;
    try {
      // 토큰을 넘겨준다. 라이브러리는 기본 이름만 스스로 읽으므로, 접두어가
      // 붙은 변수로 연결한 배포에서는 명시하지 않으면 인증에 실패한다.
      const found = await withTimeout(
        list({ prefix: this.key(name), limit: 1, token: blobToken() }),
        READ_TIMEOUT_MS,
        'Blob 목록 조회',
      );
      const blob = found.blobs.find((b) => b.pathname === this.key(name));
      if (blob) {
        const res = await fetch(blob.url, {
          cache: 'no-store',
          signal: AbortSignal.timeout(READ_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`blob ${res.status}`);
        value = (await res.json()) as T;
      } else {
        // 아직 저장한 적 없는 문서 — 배포에 포함된 초기 데이터를 쓴다.
        value = await this.fallbackStore.read(name, fallback);
      }
      this.degradedUntil = 0;
    } catch (err) {
      this.degradedUntil = Date.now() + DEGRADED_MS;
      console.error(`[store] Blob 읽기 실패 (${name}), 배포본으로 대체합니다.`, err);
      value = await this.fallbackStore.read(name, fallback);
    }

    this.cache.set(name, { at: Date.now(), value });
    return value;
  }

  async write(name: string, data: unknown): Promise<void> {
    const { put } = await import('@vercel/blob');
    // 쓰기는 대체할 수단이 없다. 실패하면 관리자에게 오류로 알린다.
    await withTimeout(
      put(this.key(name), `${JSON.stringify(data, null, 2)}\n`, {
        access: 'public',
        contentType: 'application/json',
        token: blobToken(),
        // 같은 키를 덮어쓴다. 기본값은 이름 뒤에 임의 문자열을 붙여 새 파일을
        // 만들기 때문에, 그대로 두면 저장할 때마다 다른 주소가 생긴다.
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      }),
      WRITE_TIMEOUT_MS,
      'Blob 저장',
    );
    // 저장이 됐다면 읽기도 살아 있다.
    this.degradedUntil = 0;
    this.cache.delete(name);
  }
}

/**
 * 환경에 맞는 저장소를 고른다.
 *
 * Blob 토큰이 있으면 Blob, 없으면 파일이다. 코드를 고치지 않고 환경 변수만으로
 * 갈리므로, 지금은 Vercel 에서 쓰다가 나중에 사내 서버로 옮길 때 토큰을 빼면
 * 그대로 파일 저장으로 돌아간다.
 */
export function createStore(): DocumentStore {
  return blobTokenName() ? new BlobStore() : new FileStore();
}

/**
 * 저장 가능한 환경인지 미리 알려 준다.
 *
 * 저장이 막힌 것을 저장 버튼을 눌러야 알게 되면 관리자는 폼을 다 채운 뒤에야
 * 헛수고였음을 안다. 화면을 열 때 먼저 알린다.
 *
 * 파일 저장소만 검사하면 된다 — Blob 은 토큰이 있으면 쓸 수 있고, 실제 실패는
 * 저장 시점에 오류로 나온다.
 */
let writableCache: boolean | null = null;

export async function storeStatus(): Promise<{
  kind: DocumentStore['kind'];
  writable: boolean;
  /** 화면에 그대로 보여 줄 저장 위치 설명 */
  label: string;
  /** 저장이 막혔을 때 원인을 좁혀 주는 한 줄 (없을 수 있다) */
  hint?: string;
}> {
  const tokenName = blobTokenName();
  if (tokenName) {
    return { kind: 'blob', writable: true, label: `Vercel Blob · ${tokenName}` };
  }
  const kind = 'file' as const;

  if (writableCache === null) {
    /*
      권한 비트를 보는 access(W_OK) 로는 부족하다. root 로 도는 컨테이너에서는
      비트와 무관하게 통과하고, 읽기 전용 마운트(Vercel 의 EROFS)는 비트가
      아니라 파일시스템이 막는 것이라 실제로 써 봐야만 드러난다.
    */
    const probe = path.join(DATA_DIR, '.write-probe');
    try {
      await fs.writeFile(probe, '');
      await fs.rm(probe, { force: true });
      writableCache = true;
    } catch {
      writableCache = false;
    }
  }
  /*
    "연결했는데 왜 안 되지" 를 좁혀 준다. 값은 절대 내보내지 않고 이름만 센다.
    Blob 관련 변수가 아예 없으면 연결 자체가 안 된 것이고, 있는데도 토큰으로
    잡히지 않으면 이름이 규칙에서 벗어난 것이다.
  */
  const blobish = Object.keys(process.env).filter((name) => name.includes('BLOB'));
  const hint =
    blobish.length > 0
      ? `BLOB 이 들어간 환경 변수는 있지만(${blobish.join(', ')}) 토큰으로 쓸 수 있는 이름이 아닙니다. <접두어>_READ_WRITE_TOKEN 이어야 합니다.`
      : 'Blob 관련 환경 변수가 이 배포에 하나도 없습니다. 연결이 되지 않았거나, 연결 후 다시 배포하지 않은 상태입니다.';

  return { kind, writable: writableCache, label: `파일 (${DATA_DIR})`, hint };
}
