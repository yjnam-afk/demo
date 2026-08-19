import 'server-only';
import { Client } from '@gradio/client';
import type { Tech } from '@/lib/domain/types';
import { signFileRef } from './signing';

/**
 * 결과 표현 형식.
 * Gradio 가 무엇을 돌려주든 화면은 이 4가지만 렌더한다.
 * 모델마다 다른 출력 형태를 화면 분기로 흡수하면 기술이 늘 때마다 UI 가 갈라진다.
 */
export type DemoOutput =
  | { kind: 'image'; url: string; label?: string }
  | { kind: 'video'; url: string; label?: string }
  | { kind: 'text'; value: string; label?: string }
  | { kind: 'json'; value: string; label?: string };

export interface DemoRunResult {
  outputs: DemoOutput[];
  elapsed_ms: number;
}

export class DemoUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoUnavailableError';
  }
}

const CONNECT_TIMEOUT_MS = 8_000;
const PREDICT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DemoUnavailableError(`${what} 시간 초과`)), ms),
    ),
  ]);
}

/** Gradio 의 FileData 객체를 알아본다. url 또는 path 중 하나는 반드시 있다. */
function isFileData(value: unknown): value is { url?: string; path?: string; mime_type?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.url === 'string' || typeof v.path === 'string';
}

function fileKind(mime: string | undefined, url: string): 'image' | 'video' {
  if (mime?.startsWith('video')) return 'video';
  if (mime?.startsWith('image')) return 'image';
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url) ? 'video' : 'image';
}

/**
 * Gradio 응답을 DemoOutput[] 으로 정규화한다.
 * 파일 출력의 내부망 URL 은 서명된 참조로 바꿔 우리 서버 경유로만 접근하게 한다.
 */
function normalize(data: unknown, tech: Tech, endpoint: string): DemoOutput[] {
  const items = Array.isArray(data) ? data : [data];
  const outputs: DemoOutput[] = [];

  for (const item of items) {
    if (item === null || item === undefined) continue;

    if (isFileData(item)) {
      const raw = item.url ?? new URL(`/file=${item.path}`, endpoint).toString();
      const absolute = new URL(raw, endpoint).toString();
      const proxied = `/api/demo/${tech.id}/file?ref=${encodeURIComponent(
        signFileRef(tech.id, absolute),
      )}`;
      outputs.push({ kind: fileKind(item.mime_type, absolute), url: proxied });
      continue;
    }

    if (typeof item === 'string') {
      outputs.push({ kind: 'text', value: item });
      continue;
    }

    if (typeof item === 'number' || typeof item === 'boolean') {
      outputs.push({ kind: 'text', value: String(item) });
      continue;
    }

    outputs.push({ kind: 'json', value: JSON.stringify(item, null, 2) });
  }

  return outputs;
}

/**
 * 방문자가 고른 모델을 실제 호출 주소로 바꾼다.
 *
 * 화면이 보내는 것은 목록에서의 자리(key)뿐이다. 주소를 클라이언트가 정하게
 * 하면 임의 서버를 대신 호출해 주는 통로가 되므로, 변환은 서버에서만 한다.
 * 모르는 key 는 거절하지 않고 첫 모델로 떨어뜨린다 — 관리자가 목록을 줄인
 * 뒤 옛 화면에서 누른 경우까지 실패로 만들 이유는 없다.
 */
function resolveTarget(
  demo: Extract<Tech['demo'], { type: 'api' }>,
  modelKey?: string | null,
): { endpoint: string; api_name: string } {
  const models = demo.models ?? [];
  if (models.length === 0) return { endpoint: demo.endpoint, api_name: demo.api_name };

  const index = Number(modelKey);
  const model = Number.isInteger(index) && models[index] ? models[index] : models[0];
  return { endpoint: model.endpoint, api_name: model.api_name };
}

/**
 * 추론 호출. 서버에서만 실행되며 endpoint 는 이 함수 밖으로 나가지 않는다.
 * 실패는 모두 DemoUnavailableError 로 모아 호출부가 폴백 한 갈래만 처리하게 한다.
 */
export async function runDemo(
  tech: Tech,
  input: unknown,
  modelKey?: string | null,
): Promise<DemoRunResult> {
  if (tech.demo.type !== 'api') {
    throw new DemoUnavailableError('api 타입 데모가 아닙니다.');
  }

  const { endpoint, api_name } = resolveTarget(tech.demo, modelKey);
  if (!endpoint) {
    throw new DemoUnavailableError('호출 주소가 설정되지 않았습니다.');
  }
  const started = Date.now();

  try {
    const client = await withTimeout(Client.connect(endpoint), CONNECT_TIMEOUT_MS, '데모 서버 연결');
    const payload = input === null || input === undefined ? [] : [input];
    const result = await withTimeout(
      client.predict(api_name, payload),
      PREDICT_TIMEOUT_MS,
      '추론 실행',
    );

    return {
      outputs: normalize(result.data, tech, endpoint),
      elapsed_ms: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof DemoUnavailableError) throw err;
    // 원본 메시지에는 내부 호스트가 섞일 수 있으므로 서버 로그에만 남긴다.
    console.error(`[demo:${tech.id}] 호출 실패`, err);
    throw new DemoUnavailableError('데모 서버가 응답하지 않습니다.');
  }
}

/** 엔드포인트 생존 확인. 관리자 등록 시 1회, 목록 진입 시 상태 표시에 쓴다. */
export async function checkHealth(
  tech: Tech,
): Promise<{ status: 'ok' | 'fail'; latency_ms: number; message?: string }> {
  /* 모델을 여럿 등록했으면 첫 모델을 대표로 찍는다 — 전부 두드리면 모델 서버에 부담이 간다 */
  const target =
    tech.demo.type === 'api'
      ? resolveTarget(tech.demo).endpoint
      : tech.demo.type === 'embed'
        ? tech.demo.embed_url
        : null;

  if (!target) {
    return { status: 'ok', latency_ms: 0, message: '외부 엔드포인트 없음' };
  }

  const started = Date.now();
  try {
    const response = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
      cache: 'no-store',
    });
    const latency = Date.now() - started;
    return response.ok
      ? { status: 'ok', latency_ms: latency }
      : { status: 'fail', latency_ms: latency, message: `HTTP ${response.status}` };
  } catch (err) {
    return {
      status: 'fail',
      latency_ms: Date.now() - started,
      message: err instanceof Error ? err.message : '연결 실패',
    };
  }
}
