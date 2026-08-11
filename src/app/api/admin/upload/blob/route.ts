import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAdminApi } from '@/lib/auth/guard';
import { blobToken, errorDetail } from '@/lib/data/store';
import { BLOB_UPLOAD_PATH, MEDIA_EXTENSIONS, MEDIA_MAX_BYTES } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 클라이언트 업로드 토큰 발급.
 *
 * Vercel 에서 영상은 서버를 거칠 수 없다 — 함수 요청 크기 제한(약 4.5MB)에
 * 걸린다. 그래서 브라우저가 Blob 에 직접 올리고, 이 라우트는 그 업로드를
 * 허가하는 짧은 토큰만 내준다.
 *
 * 경로 규칙 검증이 문서를 지키는 벽이다. 이 검증이 없으면 업로드 토큰으로
 * data/technologies.json 같은 문서 경로를 덮어쓸 수 있다.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      token: blobToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (!BLOB_UPLOAD_PATH.test(pathname)) {
          throw new Error('허용되지 않은 업로드 경로입니다.');
        }
        return {
          allowedContentTypes: Object.keys(MEDIA_EXTENSIONS),
          maximumSizeInBytes: MEDIA_MAX_BYTES,
          // 경로는 클라이언트가 시각(Date.now)으로 유일하게 만든다. 같은 경로
          // 재업로드는 의도된 덮어쓰기다.
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 31536000,
        };
      },
      // 업로드 완료 통지는 쓰지 않는다 — 경로는 저장 시점에 기술 데이터에 들어간다.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin] 업로드 토큰 발급 실패', err);
    return NextResponse.json(
      { error: '업로드를 시작하지 못했습니다.', detail: errorDetail(err) },
      { status: 400 },
    );
  }
}
