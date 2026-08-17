import { NextResponse } from 'next/server';
import { blobToken, blobTokenName, resolveBlobAccess } from '@/lib/data/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 긴 영상 스트리밍이 기본 실행 시간(10초)에 잘리지 않게 한다. */
export const maxDuration = 120;

/**
 * Blob 에 올라간 미디어를 공개 화면에 내보내는 경로.
 *
 * 문서·이미지·영상 전부 이 함수가 본문을 중계한다. 저장소 도메인
 * (*.blob.vercel-storage.com)을 막는 사내망이 있어, 리다이렉트로 보내면
 * 그 망의 방문자는 아무것도 받지 못한다 — 같은 origin 인 이 함수가
 * 내주면 그 차단을 지난다. 영상은 Range 요청을 그대로 전달해 탐색이 된다.
 *
 * uploads/ 밖은 내주지 않는다. 같은 저장소에 데이터 문서(data/*.json)가
 * 살고 있어서, 경로를 제한하지 않으면 이 라우트가 문서 공개 통로가 된다.
 */

/**
 * 오류를 화면에 실을 수 있는 한 줄로 줄인다.
 * 서명이 붙은 주소가 그대로 나가지 않도록 URL 은 잘라낸다.
 */
function short(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err);
  return `${name}:${message}`.replace(/https?:\/\/\S+/g, '<url>').slice(0, 160);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const pathname = parts.join('/');

  // uploads/tmp 는 조각 업로드의 중간 저장소다 — 완성 파일이 아니므로 내주지 않는다
  if (!pathname.startsWith('uploads/') || pathname.startsWith('uploads/tmp/') || pathname.includes('..')) {
    return NextResponse.json({ error: '없는 경로입니다.' }, { status: 404 });
  }
  // 파일 저장 환경에서는 업로드가 /uploads/ 정적 경로로 바로 서빙된다.
  if (!blobTokenName()) {
    return NextResponse.json({ error: '없는 경로입니다.' }, { status: 404 });
  }

  /*
    실패 지점 기록.

    이 라우트의 모든 실패가 502 한 줄로 뭉개지는 바람에, 파일이 없는
    것인지·토큰이 없는 것인지·주소를 못 찾은 것인지 구분할 수 없었다.
    화면에서 원인을 바로 읽을 수 있어야 다음 수를 정할 수 있다.
  */
  const trace: string[] = [];

  try {
    trace.push(`token=${blobTokenName()}`);
    const [access, { list, get, head }] = await Promise.all([
      resolveBlobAccess(),
      import('@vercel/blob'),
    ]);
    trace.push(`access=${access}`);

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
      let url: string | null = null;
      try {
        url = (await head(pathname, { token: blobToken() })).url;
        trace.push('head=ok');
      } catch (err) {
        trace.push(`head=${short(err)}`);
      }

      if (!url) {
        // 접미사가 어긋난 옛 업로드 — 같은 이름 줄기의 실제 파일을 찾는다
        try {
          const stem = pathname.replace(/\.[a-z0-9]+$/i, '');
          const { blobs } = await list({ prefix: stem, token: blobToken() });
          trace.push(`list=${blobs.length}건`);
          url = blobs[0]?.url ?? null;
        } catch (err) {
          trace.push(`list=${short(err)}`);
        }
      }
      if (!url) throw new Error('저장소에 이 파일이 없습니다');

      // 공개설정은 주소가 이미 확정돼 있어 캐시 옵션 용도로만 쓰인다.
      // 그래도 어긋남에 대비해 반대값으로 한 번 더 시도한다.
      const other = access === 'private' ? 'public' : 'private';
      let result = await get(url, { access, token: blobToken() }).catch((err) => {
        trace.push(`get(${access})=${short(err)}`);
        return null;
      });
      if (!result) {
        result = await get(url, { access: other, token: blobToken() }).catch((err) => {
          trace.push(`get(${other})=${short(err)}`);
          return null;
        });
      }
      if (!result?.stream) throw new Error('주소는 찾았으나 본문을 받지 못했습니다');
      return new Response(result.stream as unknown as BodyInit, {
        headers: {
          'Content-Type': result.blob.contentType || proxyType,
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=1800',
        },
      });
    }

    /*
      영상도 함수가 중계한다. 302 로 저장소 도메인에 보내면 그 도메인을
      막는 사내망에서는 재생이 안 된다 — 문서가 그랬던 것과 같은 벽이다.
      탐색(구간 이동)이 되도록 브라우저의 Range 요청을 그대로 전달하고
      저장소의 206 응답을 그대로 돌려준다.
    */
    let mediaUrl: string;
    try {
      mediaUrl = (await head(pathname, { token: blobToken() })).url;
      trace.push('head=ok');
    } catch (err) {
      trace.push(`head=${short(err)}`);
      throw new Error('저장소에 이 파일이 없습니다');
    }
    const range = request.headers.get('range');
    // 비공개 저장소의 주소는 인증 없이 열리지 않는다 — SDK 와 같은 방식으로 토큰을 싣는다
    const upstream = await fetch(mediaUrl, {
      headers: {
        authorization: `Bearer ${blobToken() ?? ''}`,
        ...(range ? { range } : {}),
      },
    });
    if (!upstream.ok && upstream.status !== 206) {
      trace.push(`fetch=${upstream.status}`);
      throw new Error('저장소에서 본문을 받지 못했습니다');
    }
    const headers = new Headers({
      'Cache-Control': 'public, max-age=1800',
      'Accept-Ranges': 'bytes',
    });
    for (const name of ['content-type', 'content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error('[media] 실패', pathname, trace, err);
    // 원인을 화면에서 바로 읽을 수 있게 실패 지점을 함께 싣는다
    return NextResponse.json(
      { error: short(err), trace: trace.join(' | ') },
      { status: 502 },
    );
  }
}
