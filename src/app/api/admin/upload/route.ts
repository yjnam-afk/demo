import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { head, put } from '@vercel/blob';
import { requireAdminApi } from '@/lib/auth/guard';
import { blobToken, blobTokenName, resolveBlobAccess } from '@/lib/data/store';
import { MEDIA_EXTENSIONS, MEDIA_KINDS, MEDIA_MAX_BYTES } from '@/lib/media';

/**
 * 서버 경유 업로드의 상한.
 * Vercel 함수의 요청 크기 제한(약 4.5MB)보다 한 걸음 안쪽이다.
 */
const SERVER_PROXY_MAX = 4 * 1024 * 1024;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

/**
 * 이 배포에서 업로드가 어느 길로 가야 하는지 알려 준다.
 *
 * Blob 환경에서는 파일이 브라우저에서 Blob 으로 바로 올라간다(클라이언트
 * 업로드). 서버를 거치면 Vercel 의 요청 크기 제한(약 4.5MB)에 걸려 영상은
 * 통과할 수 없다. 파일 환경(개발·사내 서버)에서는 아래 POST 가 디스크에 쓴다.
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!blobTokenName()) return NextResponse.json({ mode: 'file' });
  try {
    return NextResponse.json({ mode: 'blob', access: await resolveBlobAccess() });
  } catch (err) {
    // 확인이 실패해도 업로드 자체를 막지 않는다 — 진짜 원인은 업로드 시도가
    // 제대로 된 오류 문구로 알려 준다.
    console.error('[admin] 공개 설정 확인 실패', err);
    return NextResponse.json({ mode: 'blob', access: 'public' });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get('file');
  const techId = String(form.get('techId') ?? '');
  const kind = String(form.get('kind') ?? '');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(techId)) {
    return NextResponse.json({ error: '기술 id 를 먼저 입력해야 합니다.' }, { status: 400 });
  }
  if (!(MEDIA_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: '업로드 종류가 올바르지 않습니다.' }, { status: 400 });
  }
  if (file.size > MEDIA_MAX_BYTES) {
    return NextResponse.json({ error: '파일이 너무 큽니다 (최대 300MB).' }, { status: 413 });
  }

  const extension = MEDIA_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: '지원하지 않는 형식입니다. 이미지(jpg/png/webp/svg)·영상(mp4/webm)·PDF 만 올릴 수 있습니다.' },
      { status: 415 },
    );
  }

  // 파일명은 서버가 만든다. 사용자 입력을 경로에 넣지 않으므로 경로 이탈이 불가능하다.
  const filename = `${kind}-${Date.now()}.${extension}`;

  /*
    Blob 환경의 서버 경유 업로드 — 작은 파일 전용.

    사내망 중에는 Blob 저장소 도메인(*.blob.vercel-storage.com)을 막아
    브라우저 직접 업로드가 중간에 끊기는 곳이 있다. 같은 origin 인 이
    함수는 그 차단을 지나므로, 함수 요청 크기 제한 안쪽의 파일은 서버가
    대신 올린다. 큰 파일은 여전히 브라우저 직접 업로드이고, 그것도 막힌
    망에서는 드라이브 링크가 길이다.
  */
  if (blobTokenName()) {
    if (file.size > SERVER_PROXY_MAX) {
      return NextResponse.json(
        { error: '4MB 를 넘는 파일은 서버를 거쳐 올릴 수 없습니다.' },
        { status: 413 },
      );
    }
    const access = await resolveBlobAccess().catch(() => 'private' as const);
    const pathname = `uploads/${techId}/${filename}`;
    const blob = await put(pathname, Buffer.from(await file.arrayBuffer()), {
      // SDK 타입은 public 만 선언하지만 private 저장소도 같은 인자로 동작한다
      access: access as 'public',
      token: blobToken(),
      contentType: file.type,
      /*
        무작위 접미사를 끈다. 미디어 서빙 라우트(/api/media)는 정확한
        경로로 서명하므로, 저장 경로에 접미사가 붙으면 우리가 돌려준
        주소가 존재하지 않는 파일을 가리켜 화면에 아무것도 안 나온다.
        파일명에 시각이 들어 있어 충돌은 없다.
      */
      addRandomSuffix: false,
    });
    /*
      성공을 돌려주기 전에 실물을 재확인한다. put 이 성공처럼 끝나도
      저장소에 파일이 없으면 관리자는 "올렸는데 왜 안 나오지"를 화면
      502 로 한참 뒤에야 알게 된다 — 그 실패는 지금 여기서 말해야 한다.
    */
    try {
      await head(blob.url, { token: blobToken() });
    } catch (err) {
      console.error('[admin] 업로드 직후 확인 실패', blob.pathname, err);
      return NextResponse.json(
        { error: '업로드가 저장소에 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 502 },
      );
    }
    // 돌려주는 경로는 SDK 가 알려준 실제 저장 경로를 쓴다
    return NextResponse.json({ path: `/api/media/${blob.pathname}` });
  }

  const dir = path.join(UPLOAD_ROOT, techId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: `/uploads/${techId}/${filename}` });
}
