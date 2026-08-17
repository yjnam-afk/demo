import { NextResponse } from 'next/server';
import {
  completeMultipartUpload,
  createMultipartUpload,
  del,
  get,
  head,
  put,
  uploadPart,
} from '@vercel/blob';
import { requireAdminApi } from '@/lib/auth/guard';
import { blobToken, resolveBlobAccess } from '@/lib/data/store';
import { MEDIA_EXTENSIONS, MEDIA_KINDS, MEDIA_MAX_BYTES } from '@/lib/media';

/**
 * 조각 업로드 — 사내망에서 대용량 영상을 올리는 길.
 *
 * 브라우저→저장소 직접 업로드는 저장소 도메인(*.blob.vercel-storage.com)을
 * 막는 사내망에서 영원히 멈춘다. 서버 경유는 함수 요청 크기 제한(약 4.5MB)에
 * 걸려 영상이 통과하지 못한다. 그래서 둘을 나눈다:
 *
 *  1) piece — 브라우저가 파일을 3.8MB 조각으로 잘라 같은 origin 인 이 함수로
 *     보낸다. 조각마다 요청 크기 제한 안쪽이므로 전부 통과한다. 서버는
 *     조각을 임시 경로(uploads/tmp/…)에 쌓는다.
 *  2) complete — 서버가 저장소 안에서 조각을 이어붙여 최종 파일을 만든다
 *     (멀티파트 업로드: 조각을 5MB 이상 파트로 묶어 전송). 임시 조각은
 *     지우고, 실물 확인(head)까지 통과해야 성공을 돌려준다.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 조각 조립은 파일 전체를 저장소에서 읽고 다시 쓴다 — 기본 10초로는 모자란다. */
export const maxDuration = 120;

/** 함수 요청 크기 제한(약 4.5MB)보다 한 걸음 안쪽. 클라이언트와 같은 값. */
const PIECE_MAX = 4 * 1024 * 1024;
/** 멀티파트 파트 최소 크기 — 마지막 파트만 이보다 작아도 된다. */
const PART_MIN = 5 * 1024 * 1024;
const MAX_PIECES = Math.ceil(MEDIA_MAX_BYTES / (3.5 * 1024 * 1024));

const KEY_RE = /^[a-z0-9-]{8,48}$/;

function tmpPath(key: string, index: number) {
  return `uploads/tmp/${key}/p${String(index).padStart(4, '0')}`;
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'piece') {
    const key = url.searchParams.get('key') ?? '';
    const index = Number(url.searchParams.get('index'));
    if (!KEY_RE.test(key) || !Number.isInteger(index) || index < 0 || index >= MAX_PIECES) {
      return NextResponse.json({ error: '조각 정보가 올바르지 않습니다.' }, { status: 400 });
    }
    const body = Buffer.from(await request.arrayBuffer());
    if (body.length === 0 || body.length > PIECE_MAX) {
      return NextResponse.json({ error: '조각 크기가 올바르지 않습니다.' }, { status: 400 });
    }
    const access = await resolveBlobAccess().catch(() => 'private' as const);
    await put(tmpPath(key, index), body, {
      access: access as 'public',
      token: blobToken(),
      contentType: 'application/octet-stream',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'complete') {
    const payload = (await request.json().catch(() => ({}))) as {
      key?: string;
      pieces?: number;
      techId?: string;
      kind?: string;
      contentType?: string;
    };
    const { key = '', pieces = 0, techId = '', kind = '', contentType = '' } = payload;

    if (!KEY_RE.test(key) || !Number.isInteger(pieces) || pieces < 1 || pieces > MAX_PIECES) {
      return NextResponse.json({ error: '조립 정보가 올바르지 않습니다.' }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(techId)) {
      return NextResponse.json({ error: '기술 id 가 올바르지 않습니다.' }, { status: 400 });
    }
    if (!(MEDIA_KINDS as readonly string[]).includes(kind)) {
      return NextResponse.json({ error: '업로드 종류가 올바르지 않습니다.' }, { status: 400 });
    }
    const extension = MEDIA_EXTENSIONS[contentType];
    if (!extension) {
      return NextResponse.json({ error: '지원하지 않는 형식입니다.' }, { status: 415 });
    }

    const access = (await resolveBlobAccess().catch(() => 'private' as const)) as 'public';
    const token = blobToken();
    const pathname = `uploads/${techId}/${kind}-${Date.now()}.${extension}`;

    const mpu = await createMultipartUpload(pathname, {
      access,
      token,
      contentType,
    });

    /*
      조각(≤4MB)을 파트(≥5MB) 로 묶는다. 조각을 순서대로 읽어 5MB 를
      넘길 때마다 한 파트로 보낸다 — 마지막 파트만 작아도 된다.
    */
    const parts: { etag: string; partNumber: number }[] = [];
    let buffer: Buffer[] = [];
    let buffered = 0;
    let partNumber = 1;

    const flush = async () => {
      if (buffered === 0) return;
      const part = await uploadPart(pathname, Buffer.concat(buffer), {
        access,
        token,
        uploadId: mpu.uploadId,
        key: mpu.key,
        partNumber,
      });
      parts.push({ etag: part.etag, partNumber });
      partNumber += 1;
      buffer = [];
      buffered = 0;
    };

    for (let i = 0; i < pieces; i++) {
      const piece = await get(tmpPath(key, i), { access, token });
      if (!piece?.stream) {
        return NextResponse.json(
          { error: `조각 ${i + 1}/${pieces} 이 저장소에 없습니다. 처음부터 다시 올려 주세요.` },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await new Response(piece.stream as BodyInit).arrayBuffer());
      buffer.push(bytes);
      buffered += bytes.length;
      if (buffered >= PART_MIN) await flush();
    }
    await flush();

    await completeMultipartUpload(pathname, parts, {
      access,
      token,
      uploadId: mpu.uploadId,
      key: mpu.key,
    });

    // 임시 조각 정리 — 실패해도 업로드 자체에는 지장이 없다
    await Promise.all(
      Array.from({ length: pieces }, (_, i) => del(tmpPath(key, i), { token }).catch(() => {})),
    );

    // 성공을 돌려주기 전에 실물을 재확인한다
    try {
      await head(pathname, { token });
    } catch (err) {
      console.error('[admin] 조각 조립 후 확인 실패', pathname, err);
      return NextResponse.json(
        { error: '조립이 저장소에 반영되지 않았습니다. 다시 시도해 주세요.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ path: `/api/media/${pathname}` });
  }

  return NextResponse.json({ error: '알 수 없는 동작입니다.' }, { status: 400 });
}
