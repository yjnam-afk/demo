import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 구글 드라이브 미디어 연결.
 *
 * 경로는 /api/media/gdrive/<파일id>/<이름.확장자> 꼴이다. 첫 조각만 파일 id 로
 * 쓰고 나머지는 무시한다 — 뒤에 붙는 이름은 화면 코드가 확장자로 이미지·PDF·
 * 영상을 구분하기 위한 표식이다(드라이브 링크 자체에는 확장자가 없다).
 * 표식은 관리자가 링크를 붙여넣을 때 서버가 드라이브 메타데이터를 조회해
 * 붙인다(/api/admin/gdrive-meta).
 *
 * Drive API 의 파일 본문 주소로 연결한다 — 확인 페이지가 없고 Range 요청
 * (탐색)도 받는, 드라이브에서 유일하게 안정적인 접근 경로다. 파일 본문은
 * 함수를 거치지 않고 구글이 직접 내린다.
 *
 * 필요한 것:
 *  - GOOGLE_DRIVE_API_KEY 환경 변수 (HTTP 리퍼러를 사이트 도메인으로 제한할
 *    것 — 키가 리다이렉트 주소에 드러난다)
 *  - 파일 공유 설정이 "링크가 있는 모든 사용자"
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const id = parts[0] ?? '';

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
