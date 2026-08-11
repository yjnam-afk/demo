'use client';

import { useRef, useState } from 'react';
import { TextInput } from './fields';
import { MEDIA_EXTENSIONS } from '@/lib/media';

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
  kind: 'thumbnail' | 'loop' | 'video';
  value: string;
  onChange: (path: string) => void;
  accept: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
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
    });
    onChange(`/api/media/${result.pathname}`);
  }

  async function upload(file: File) {
    if (!techId) {
      setError('기술 id 를 먼저 입력해야 업로드할 수 있습니다.');
      return;
    }

    setPending(true);
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
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <TextInput
          value={value}
          placeholder="/uploads/... 또는 직접 경로 입력"
          onChange={(event) => onChange(event.target.value)}
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
          {pending ? '업로드 중…' : '업로드'}
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

      {/* 올린 파일이 의도한 것인지 바로 확인할 수 있게 미리보기를 붙인다 */}
      {value && kind === 'thumbnail' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 w-auto rounded border border-ink-200" />
      ) : null}
      {value && kind !== 'thumbnail' ? (
        <video src={value} className="h-24 w-auto rounded border border-ink-200" muted controls />
      ) : null}
    </div>
  );
}
