'use client';

import { useRef, useState } from 'react';
import { TextInput } from './fields';
import { isImagePath, MEDIA_EXTENSIONS, type MediaKind } from '@/lib/media';
import { normalizeMediaPath } from '@/lib/gdrive';

/**
 * 썸네일·영상 업로드.
 * 경로를 직접 입력할 수도 있게 둔다 — 이미 서버에 올려 둔 파일을 쓰는 경우가 있고,
 * 업로드만 허용하면 그 경로를 넣을 방법이 없어진다.
 */
export function MediaUpload({
  techId,
  kind,
  value,
  onChange,
  accept,
}: {
  techId: string;
  kind: MediaKind;
  value: string;
  onChange: (path: string) => void;
  accept: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * 드라이브 경로에 형식 표식 붙이기.
   *
   * 드라이브 링크에는 확장자가 없어 화면이 이미지·PDF·영상을 구분하지
   * 못한다. 링크가 정규화되면 서버에 파일 형식을 물어(관리자 라우트가
   * 드라이브 메타데이터를 조회한다) 경로 뒤에 이름.확장자를 붙인다.
   * 조회가 실패해도 링크는 그대로 동작한다 — 표식만 없는 상태가 된다.
   */
  async function enrichDrivePath(path: string) {
    const match = /^\/api\/media\/gdrive\/([A-Za-z0-9_-]{10,})$/.exec(path);
    if (!match) return;

    try {
      const response = await fetch(`/api/admin/gdrive-meta?id=${match[1]}`);
      const meta = (await response.json().catch(() => ({}))) as {
        name?: string;
        extension?: string | null;
      };
      if (!response.ok || !meta.extension) return;

      const slug =
        (meta.name ?? '')
          .replace(/\.[A-Za-z0-9]+$/, '')
          .replace(/[^A-Za-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'file';
      onChange(`${path}/${slug}.${meta.extension}`);
    } catch {
      // 표식 없이도 재생·다운로드는 된다. 조용히 넘어간다.
    }
  }
  const [pending, setPending] = useState(false);
  /*
    진행률이 없으면 수십 MB 영상 업로드가 멈춘 것과 구분되지 않는다.
    "업로드 중…" 만 몇 분 돌면 사용자는 무한 로딩으로 읽고 새로고침한다.
  */
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 파일 환경 — 서버가 public/uploads 디스크에 쓴다. */
  async function uploadToServer(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('techId', techId);
    form.append('kind', kind);

    const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
    const body = (await response.json().catch(() => ({}))) as { path?: string; error?: string };

    if (!response.ok || !body.path) {
      setError(body.error ?? '업로드하지 못했습니다.');
      return;
    }
    onChange(body.path);
  }

  /**
   * Blob 환경 — 브라우저가 Blob 에 직접 올린다.
   *
   * 서버를 거치면 Vercel 함수의 요청 크기 제한(약 4.5MB)에 걸려 영상이
   * 통과하지 못한다. 서버는 토큰만 내준다(/api/admin/upload/blob).
   * 올라간 파일은 /api/media/ 경로로 참조한다 — private 저장소의 Blob
   * 주소는 그냥 열리지 않아, 그 경로가 서명된 주소로 이어 준다.
   */
  async function uploadToBlob(file: File, access: 'public' | 'private') {
    const extension = MEDIA_EXTENSIONS[file.type];
    if (!extension) {
      setError('지원하지 않는 형식입니다. 이미지(jpg/png/webp/svg) 또는 영상(mp4/webm)만 올릴 수 있습니다.');
      return;
    }

    const { upload: blobUpload } = await import('@vercel/blob/client');
    const result = await blobUpload(`uploads/${techId}/${kind}-${Date.now()}.${extension}`, file, {
      access,
      handleUploadUrl: '/api/admin/upload/blob',
      contentType: file.type,
      /*
        큰 파일은 조각으로 나눠 올린다. 한 덩어리 PUT 은 수십 MB 전송 중
        연결이 한 번만 흔들려도 전체가 멈추는데, 조각 업로드는 조각별로
        재시도하므로 중간에 끊겨도 이어서 간다. 작은 이미지까지 조각내면
        요청 수만 늘어나므로 경계를 둔다.
      */
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
    });
    onChange(`/api/media/${result.pathname}`);
  }

  async function upload(file: File) {
    if (!techId) {
      setError('기술 id 를 먼저 입력해야 업로드할 수 있습니다.');
      return;
    }

    setPending(true);
    setProgress(null);
    setError(null);
    try {
      // 배포 환경에 따라 업로드 경로가 다르다. 서버가 판단해 알려 준다.
      const probe = await fetch('/api/admin/upload');
      const target = (await probe.json().catch(() => ({}))) as {
        mode?: 'file' | 'blob';
        access?: 'public' | 'private';
      };

      if (target.mode === 'blob') {
        await uploadToBlob(file, target.access ?? 'public');
      } else {
        await uploadToServer(file);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message ? `업로드하지 못했습니다. (${message.slice(0, 200)})` : '업로드 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <TextInput
          value={value}
          placeholder="/uploads/... 경로, 또는 구글 드라이브 공유 링크"
          /*
            드라이브 공유 링크는 붙여넣는 즉시 재생 가능한 내부 경로로 바뀐다.
            서버 저장 시점에도 같은 정규화를 거치므로 화면을 우회해도 결과는 같다.
          */
          onChange={(event) => {
            const normalized = normalizeMediaPath(event.target.value);
            onChange(normalized);
            void enrichDrivePath(normalized);
          }}
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="rounded border border-ink-300 px-3 py-2 text-sm text-ink-700 hover:border-ink-500 disabled:opacity-60"
        >
          {pending ? (progress !== null ? `업로드 ${progress}%` : '업로드 중…') : '업로드'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded border border-ink-300 px-2.5 text-sm text-ink-500 hover:border-ink-500"
            aria-label="지우기"
          >
            ×
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-[var(--color-signal-fail)]">{error}</p> : null}

      {/*
        미리보기는 이미지에만 붙인다. 영상 미리보기는 정보 없이 자리만 차지했고
        (재생해 보기 전에는 검은 상자다), 링크·PDF·드라이브 경로는 애초에
        미리볼 수 없다. 영상 확인은 공개 화면에서 한다.
      */}
      {value && (kind === 'thumbnail' || isImagePath(value)) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 w-auto rounded border border-ink-200" />
      ) : null}
    </div>
  );
}
