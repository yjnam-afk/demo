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
    const [access, { issueSignedToken, presignUrl, list, get, head }] = await Promise.all([
      resolveBlobAccess(),
      import('@vercel/blob'),
    ]);

    const presignFor = async (target: string) => {
      const issued = await issueSignedToken({
        pathname: target,
        operations: ['get'],
        validUntil: Date.now() + TTL_MS,
        token: blobToken(),
      });
      const { presignedUrl } = await presignUrl(issued, {
        operation: 'get',
        pathname: target,
        access,
      });
      return presignedUrl;
    };

    /*
      문서와 이미지는 함수가 본문을 중계한다. 두 가지 이유다:
       - 내장 뷰어(<object>)는 302 를 따라가지 않아 리다이렉트로는 빈 칸이 된다
       - 사내망 중에는 Blob 저장소 도메인을 막는 곳이 있어, 리다이렉트를
         받은 브라우저가 최종 주소에 닿지 못한다. 같은 origin 인 이 함수가
         본문을 내주면 그 차단을 지난다.
      문서·이미지는 수 MB 수준이라 중계 비용이 작다 — 큰 영상만 리다이렉트로
      남긴다 (영상은 함수 실행 시간 제한에 걸린다. 막힌 망에서는 드라이브가 길이다).

      중계는 서명 주소를 쓰지 않는다. 서명 발급(issueSignedToken → presignUrl)은
      실패 지점이 두 개인데, 그 중 하나만 어긋나도 올라가 있는 파일이 화면에서
      죽는다 — 실제로 업로드 직후 확인(head)은 통과한 파일이 서빙에서만 502 로
      끝나는 사고가 났다. get 은 head 와 같은 토큰 직접 인증이라 그 두 지점을
      통째로 건너뛴다. 서명은 브라우저가 직접 여는 영상 리다이렉트에만 남는다.
    */
    const PROXY_TYPES: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      gif: 'image/gif',
    };
    const extension = pathname.toLowerCase().split('.').pop() ?? '';
    const proxyType = PROXY_TYPES[extension];
    if (proxyType) {
      /*
        저장소 주소를 우리가 조립하지 않는다.

        경로+공개설정으로 주소를 만들면, 그 공개설정이 실제 저장소와
        어긋나는 순간 존재하는 파일도 404 가 된다 — 업로드는 저장소가
        돌려준 주소를 그대로 써서 통과하는데 서빙만 502 로 죽던 원인이다.
        head/list 는 조립 없이 API 로 물어보므로 그 어긋남을 타지 않는다.
        여기서 얻은 실제 주소로만 본문을 받는다.
      */
      const realUrl = async (target: string): Promise<string | null> => {
        try {
          return (await head(target, { token: blobToken() })).url;
        } catch {
          return null;
        }
      };

      let url = await realUrl(pathname);
      if (!url) {
        // 접미사가 어긋난 옛 업로드 — 같은 이름 줄기의 실제 파일을 찾는다
        const stem = pathname.replace(/\.[a-z0-9]+$/i, '');
        const { blobs } = await list({ prefix: stem, token: blobToken() });
        url = blobs[0]?.url ?? null;
      }
      if (!url) throw new Error('저장소에 파일이 없습니다');

      // 공개설정은 주소가 이미 확정돼 있어 캐시 옵션 용도로만 쓰인다.
      // 그래도 어긋남에 대비해 반대값으로 한 번 더 시도한다.
      const other = access === 'private' ? 'public' : 'private';
      let result = await get(url, { access, token: blobToken() }).catch(() => null);
      if (!result) result = await get(url, { access: other, token: blobToken() }).catch(() => null);
      if (!result?.stream) throw new Error('본문을 받지 못했습니다');
      return new Response(result.stream as unknown as BodyInit, {
        headers: {
          'Content-Type': result.blob.contentType || proxyType,
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }

    const presignedUrl = await presignFor(pathname);
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
