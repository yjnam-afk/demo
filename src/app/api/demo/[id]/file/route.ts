import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { verifyFileRef } from '@/lib/demo/signing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 데모 결과 파일 중계.
 * 서명된 참조만 받아들이므로 임의 주소를 대신 요청해 주는 통로가 되지 않는다.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return new NextResponse('missing ref', { status: 400 });

  const tech = await getRepo().getShareable(id);
  if (!tech) return new NextResponse('not found', { status: 404 });

  const target = verifyFileRef(id, ref);
  if (!target) return new NextResponse('invalid ref', { status: 403 });

  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('upstream error', { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error(`[demo:${id}] 결과 파일 중계 실패`, err);
    return new NextResponse('upstream unreachable', { status: 502 });
  }
}
