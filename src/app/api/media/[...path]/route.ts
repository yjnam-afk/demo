import { NextResponse } from 'next/server';
import { blobToken, blobTokenName, resolveBlobAccess } from '@/lib/data/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Blob 에 올라간 미디어를 공개 화면에 내보내는 경로.
 *
 * 저장소가 private 이면 Blob 주소는 그냥 열리지 않는다. 그래서 업로드된
 * 미디어는 /api/media/<경로> 로 참조하고, 이 라우트가 서명된 임시 주소를
 * 만들어 그리로 보낸다. 영상 본문은 함수를 거치지 않고 CDN 에서 바로
 * 내려간다 — 40MB 영상을 함수로 중계하면 실행 시간 제한에 걸린다.
 *
 * uploads/ 밖은 내주지 않는다. 같은 저장소에 데이터 문서(data/*.json)가
 * 살고 있어서, 경로를 제한하지 않으면 이 라우트가 문서 공개 통로가 된다.
 */
const TTL_MS = 3_600_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const pathname = parts.join('/');

  if (!pathname.startsWith('uploads/') || pathname.includes('..')) {
    return NextResponse.json({ error: '없는 경로입니다.' }, { status: 404 });
  }
  // 파일 저장 환경에서는 업로드가 /uploads/ 정적 경로로 바로 서빙된다.
  if (!blobTokenName()) {
    return NextResponse.json({ error: '없는 경로입니다.' }, { status: 404 });
  }

  try {
    const [access, { issueSignedToken, presignUrl }] = await Promise.all([
      resolveBlobAccess(),
      import('@vercel/blob'),
    ]);

    const issued = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil: Date.now() + TTL_MS,
      token: blobToken(),
    });
    const { presignedUrl } = await presignUrl(issued, { operation: 'get', pathname, access });

    /*
      PDF 는 함수가 본문을 중계한다. 상세 화면의 내장 뷰어(<object>)는
      302 를 따라가지 않아, 리다이렉트 방식으로는 미리보기가 빈 칸이 된다.
      문서는 수 MB 수준이라 중계 비용이 작다 — 큰 영상은 계속 리다이렉트다.
    */
    if (pathname.toLowerCase().endsWith('.pdf')) {
      const upstream = await fetch(presignedUrl);
      if (!upstream.ok || !upstream.body) throw new Error(`업스트림 ${upstream.status}`);
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }

    return NextResponse.redirect(presignedUrl, {
      status: 302,
      // 서명 유효기간(1시간)보다 짧게 캐시한다. 재생 중 만료로 끊기지 않게 여유를 둔다.
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch (err) {
    console.error('[media] 서명 주소 발급 실패', pathname, err);
    return NextResponse.json({ error: '미디어를 불러오지 못했습니다.' }, { status: 502 });
  }
}
