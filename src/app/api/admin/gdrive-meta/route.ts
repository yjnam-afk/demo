import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/guard';
import { MEDIA_EXTENSIONS } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 드라이브 파일의 형식 조회.
 *
 * 드라이브 링크에는 확장자가 없어 화면이 이미지·PDF·영상을 구분할 수 없다.
 * 관리자가 링크를 붙여넣으면 이 라우트가 드라이브에서 파일 이름과 MIME 을
 * 조회해 주고, 화면은 그 확장자를 경로 뒤에 붙여 저장한다.
 *
 * 조회는 서버에서 구글로 바로 나간다 — 관리자의 회사망은 개입하지 않는다.
 */
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    return NextResponse.json({ error: '파일 id 가 올바르지 않습니다.' }, { status: 400 });
  }

  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) {
    // 키가 없어도 링크 자체는 쓸 수 있다 — 형식 표식만 못 붙일 뿐이다.
    return NextResponse.json({ error: 'GOOGLE_DRIVE_API_KEY 가 설정되지 않았습니다.' }, { status: 503 });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType&key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(5_000), cache: 'no-store' },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: `드라이브 조회 실패 (${response.status})` },
        { status: 502 },
      );
    }

    const meta = (await response.json()) as { name?: string; mimeType?: string };
    return NextResponse.json({
      name: meta.name ?? '',
      mimeType: meta.mimeType ?? '',
      /** 아는 형식이면 확장자, 모르면 null — 화면은 null 이면 표식을 붙이지 않는다 */
      extension: meta.mimeType ? (MEDIA_EXTENSIONS[meta.mimeType] ?? null) : null,
    });
  } catch (err) {
    console.error('[admin] 드라이브 메타 조회 실패', err);
    return NextResponse.json({ error: '드라이브에 연결하지 못했습니다.' }, { status: 502 });
  }
}
