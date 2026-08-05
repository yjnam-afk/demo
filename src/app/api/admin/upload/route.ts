import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
const MAX_BYTES = 300 * 1024 * 1024;

/** 확장자는 실제 MIME 에서 정한다. 파일명에 담긴 확장자는 신뢰하지 않는다. */
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** 업로드 대상 슬롯. 임의 경로에 쓰지 못하게 목록으로 묶는다. */
const KINDS = ['thumbnail', 'loop', 'video'] as const;

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
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: '업로드 종류가 올바르지 않습니다.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '파일이 너무 큽니다 (최대 300MB).' }, { status: 413 });
  }

  const extension = ALLOWED[file.type];
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
