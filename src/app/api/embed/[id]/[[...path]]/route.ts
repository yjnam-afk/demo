import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * embed 타입 웹앱의 리버스 프록시.
 *
 * iframe 의 src 는 /api/embed/{id}/ 이고 내부망 주소는 서버에만 존재한다.
 * 응답 본문은 스트리밍으로 그대로 흘려보내 3D 에셋 같은 대용량 파일도 버퍼링하지 않는다.
 *
 * HTML 응답에는 <base> 를 주입해 앱의 상대 경로 자원이 프록시 경로 아래로
 * 다시 들어오게 만든다. 앱이 "/static/..." 같은 루트 절대 경로를 쓰면 이 방식으로는
 * 잡히지 않으므로, 그런 앱은 별도 공개 도메인을 두고 embed_url 에 그 주소를 넣는다.
 */

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
]);

// 우리가 iframe 으로 감싸는 것이 목적이므로 상대의 프레임 차단 헤더는 걷어낸다.
const FRAME_BLOCKING = new Set(['x-frame-options', 'content-security-policy']);

async function proxy(request: Request, id: string, segments: string[]) {
  const tech = await getRepo().getPublic(id);
  if (!tech || tech.demo.type !== 'embed') {
    return new NextResponse('not found', { status: 404 });
  }

  const base = new URL(tech.demo.embed_url);
  const target = new URL(`${base.pathname.replace(/\/$/, '')}/${segments.join('/')}`, base);

  // 방문자가 보낸 질의 문자열을 유지하고, 관리자가 정한 크롬 제거 파라미터를 덧붙인다.
  const incoming = new URL(request.url).searchParams;
  for (const [key, value] of incoming) target.searchParams.set(key, value);
  for (const [key, value] of Object.entries(tech.demo.chromeless_params ?? {})) {
    target.searchParams.set(key, value);
  }

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // @ts-expect-error duplex 는 스트리밍 본문 전달에 필요하지만 타입 정의에 아직 없다
      duplex: 'half',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower) || FRAME_BLOCKING.has(lower)) continue;
      responseHeaders.set(key, value);
    }

    const contentType = upstream.headers.get('content-type') ?? '';

    if (contentType.includes('text/html')) {
      const html = await upstream.text();
      const baseTag = `<base href="/api/embed/${id}/">`;
      const injected = /<head[^>]*>/i.test(html)
        ? html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`)
        : `${baseTag}${html}`;
      responseHeaders.set('content-type', contentType);
      return new NextResponse(injected, { status: upstream.status, headers: responseHeaders });
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (err) {
    console.error(`[embed:${id}] 프록시 실패`, err);
    // iframe 안에서 502 를 만나면 화면 쪽 폴백이 동작한다.
    return new NextResponse('데모 서버에 연결할 수 없습니다.', { status: 502 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id, path: segments } = await context.params;
  return proxy(request, id, segments ?? []);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id, path: segments } = await context.params;
  return proxy(request, id, segments ?? []);
}
