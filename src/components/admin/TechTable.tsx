'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Health } from '@/lib/domain/types';
import { VISIBILITY_LABELS, type Visibility } from '@/lib/domain/enums';

/** 범위가 넓어질수록 눈에 띄게 한다 — 외부 공개만 색을 준다. */
const VISIBILITY_BADGE: Record<Visibility, string> = {
  draft: 'w-fit rounded bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-500',
  internal: 'w-fit rounded bg-ink-200 px-1.5 py-0.5 text-xs font-medium text-ink-700',
  link: 'w-fit rounded bg-[var(--color-signal-warn-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-signal-warn)]',
  public:
    'w-fit rounded bg-[var(--color-signal-ok-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-signal-ok)]',
};

export interface AdminRow {
  id: string;
  name: string;
  domain: string;
  category: string;
  demoType: string;
  visibility: Visibility;
  metricCount: number;
  health: Health | null;
  hasEndpoint: boolean;
  warnings: string[];
  publishIssues: string[];
}

function HealthCell({ row, onRecheck }: { row: AdminRow; onRecheck: () => void }) {
  if (!row.hasEndpoint) return <span className="text-xs text-ink-400">해당 없음</span>;

  const status = row.health?.status ?? 'unknown';
  const tone =
    status === 'ok'
      ? 'text-[var(--color-signal-ok)]'
      : status === 'fail'
        ? 'text-[var(--color-signal-fail)]'
        : 'text-ink-400';
  const text = status === 'ok' ? '정상' : status === 'fail' ? '응답 없음' : '미확인';

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs font-medium ${tone}`}>● {text}</span>
      {row.health?.checked_at ? (
        <span className="numeric text-xs text-ink-400">
          {new Date(row.health.checked_at).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRecheck}
        className="w-fit text-xs text-ink-500 underline underline-offset-2 hover:text-ink-900"
      >
        다시 확인
      </button>
    </div>
  );
}

/**
 * 기술 목록.
 *
 * 순서 변경은 위/아래 버튼으로 처리한다. 끌어놓기는 모바일과 키보드에서 다루기
 * 어렵고, 이 순서가 카탈로그 정렬뿐 아니라 랜딩의 히어로·대표 기술까지 정하므로
 * 조작이 확실한 쪽을 택했다.
 */
/** 주소 조립을 화면이 대신한다. 관리자가 손으로 만들면 오타가 고객에게 간다. */
function useCopyLink() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyLink(id: string) {
    const url = `${window.location.origin}/tech/${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드 권한이 없는 환경도 있다. 그때는 주소를 띄워 직접 복사하게 한다.
      window.prompt('아래 주소를 복사하세요', url);
    }
    setCopied(id);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return { copied, copyLink };
}

export function TechTable({ rows }: { rows: AdminRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { copied, copyLink } = useCopyLink();
  const [error, setError] = useState<string | null>(null);

  async function call(label: string, input: RequestInfo, init?: RequestInit) {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? '요청을 처리하지 못했습니다.');
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('서버에 연결하지 못했습니다.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= rows.length) return;

    const ids = rows.map((row) => row.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];

    void call(`move-${rows[index].id}`, '/api/admin/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
        등록된 기술이 없습니다.
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p className="mb-3 rounded border border-[var(--color-signal-fail)]/30 bg-[var(--color-signal-fail-soft)] px-3 py-2 text-sm text-[var(--color-signal-fail)]">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-ink-300 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs tracking-wide text-ink-500 uppercase">
              <th className="w-20 px-3 py-2 font-medium">순서</th>
              <th className="px-3 py-2 font-medium">기술</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">데모 상태</th>
              <th className="px-3 py-2 font-medium">점검</th>
              <th className="w-28 px-3 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-ink-100 align-top">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <span className="numeric w-5 text-xs text-ink-400">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || busy !== null}
                      className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                      aria-label="위로"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1 || busy !== null}
                      className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                      aria-label="아래로"
                    >
                      ↓
                    </button>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <Link href={`/admin/tech/${row.id}`} className="font-medium text-ink-900 hover:underline">
                    {row.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {row.domain} · {row.category || '카테고리 없음'} · {row.demoType} · 지표{' '}
                    {row.metricCount}개
                  </div>
                  <div className="numeric mt-0.5 text-xs text-ink-400">{row.id}</div>
                </td>

                <td className="px-3 py-3">
                  {/* 범위는 하나의 값이다. 두 줄로 나누면 다시 두 축처럼 읽힌다. */}
                  <div className="flex flex-col items-start gap-1">
                    <span className={VISIBILITY_BADGE[row.visibility]}>
                      {VISIBILITY_LABELS[row.visibility]}
                    </span>
                    {/*
                      링크 공개는 주소를 전달해야 의미가 있다. 관리자가 주소를
                      직접 조립하게 두면 오타가 나고, 오타 난 링크는 고객에게
                      404 로 도착한다.
                    */}
                    {row.visibility === 'link' ? (
                      <button
                        type="button"
                        onClick={() => void copyLink(row.id)}
                        className="text-xs text-ink-500 underline underline-offset-2 hover:text-ink-900"
                      >
                        {copied === row.id ? '복사했습니다' : '링크 복사'}
                      </button>
                    ) : null}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <HealthCell
                    row={row}
                    onRecheck={() =>
                      void call(`health-${row.id}`, `/api/admin/tech/${row.id}/health`, {
                        method: 'POST',
                      })
                    }
                  />
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    {/* 외부 공개를 막는 항목과 단순 경고를 색으로 구분한다 */}
                    {row.publishIssues.length > 0 ? (
                      <span className="w-fit rounded bg-[var(--color-signal-fail-soft)] px-1.5 py-0.5 text-xs text-[var(--color-signal-fail)]">
                        외부 공개 불가 · {row.publishIssues.join(', ')}
                      </span>
                    ) : null}
                    {row.warnings.map((warning) => (
                      <span
                        key={warning}
                        className="w-fit rounded bg-[var(--color-signal-warn-soft)] px-1.5 py-0.5 text-xs text-[var(--color-signal-warn)]"
                      >
                        {warning}
                      </span>
                    ))}
                    {row.publishIssues.length === 0 && row.warnings.length === 0 ? (
                      <span className="text-xs text-ink-400">이상 없음</span>
                    ) : null}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={`/admin/tech/${row.id}`}
                      className="text-xs text-ink-600 hover:text-ink-900"
                    >
                      수정
                    </Link>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!confirm(`"${row.name}" 을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
                        void call(`delete-${row.id}`, `/api/admin/tech/${row.id}`, {
                          method: 'DELETE',
                        });
                      }}
                      className="text-xs text-[var(--color-signal-fail)] hover:underline disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
