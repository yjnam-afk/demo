import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/guard';
import { blobTokenName, resolveBlobAccess } from '@/lib/data/store';
import { MEDIA_EXTENSIONS, MEDIA_KINDS, MEDIA_MAX_BYTES } from '@/lib/media';

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
      { error: '지원하지 않는 형식입니다. 이미지(jpg/png/webp/svg) 또는 영상(mp4/webm)만 올릴 수 있습니다.' },
      { status: 415 },
    );
  }

  // 파일명은 서버가 만든다. 사용자 입력을 경로에 넣지 않으므로 경로 이탈이 불가능하다.
  const dir = path.join(UPLOAD_ROOT, techId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${kind}-${Date.now()}.${extension}`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: `/uploads/${techId}/${filename}` });
}
