import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 구글 드라이브 영상 연결.
 *
 * 관리자가 붙여넣은 드라이브 공유 링크는 저장 시점에 /api/media/gdrive/<id>
 * 로 정규화된다(src/lib/gdrive.ts). 이 라우트가 그 경로를 Drive API 의
 * 파일 본문 주소로 연결한다 — 확인 페이지가 없고 Range 요청(탐색)도 받는
 * 유일하게 안정적인 드라이브 접근 경로다.
 *
 * 파일 본문은 함수를 거치지 않는다. 구글이 직접 내리므로 Vercel 전송량과
 * 함수 실행 시간을 쓰지 않는다.
 *
 * 필요한 것:
 *  - GOOGLE_DRIVE_API_KEY 환경 변수 (Google Cloud Console 에서 Drive API
 *    사용 설정 후 발급. HTTP 리퍼러를 사이트 도메인으로 제한할 것 — 키가
 *    리다이렉트 주소에 드러나므로 제한 없는 키를 쓰면 안 된다)
 *  - 파일 공유 설정이 "링크가 있는 모든 사용자"
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    return NextResponse.json({ error: '없는 경로입니다.' }, { status: 404 });
  }

  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          '드라이브 연결이 설정되지 않았습니다. GOOGLE_DRIVE_API_KEY 환경 변수를 추가하고 다시 배포하세요.',
      },
      { status: 503 },
    );
  }

  const target = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${encodeURIComponent(key)}`;
  return NextResponse.redirect(target, {
    status: 302,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
