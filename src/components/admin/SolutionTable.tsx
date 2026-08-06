'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VISIBILITY_LABELS, type Visibility } from '@/lib/domain/enums';

const VISIBILITY_BADGE: Record<Visibility, string> = {
  draft: 'rounded bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-500',
  internal: 'rounded bg-ink-200 px-1.5 py-0.5 text-xs font-medium text-ink-700',
  public:
    'rounded bg-[var(--color-signal-ok-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-signal-ok)]',
};

export interface SolutionRow {
  id: string;
  kind: 'product' | 'scenario';
  title: string;
  visibility: Visibility;
  stepCount: number;
  /** 공개 화면에 실제로 그려질 구성 기술 수 */
  visibleStepCount: number;
  industries: string[];
  publishIssues: string[];
}

export function SolutionTable({ rows }: { rows: SolutionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(row: SolutionRow) {
    if (!confirm(`"${row.title}" 항목을 삭제할까요?`)) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/solutions/${row.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? '삭제하지 못했습니다.');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
        등록된 제품·시나리오가 없습니다.
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs tracking-wide text-ink-500 uppercase">
              <th className="px-3 py-2 font-medium">항목</th>
              <th className="px-3 py-2 font-medium">구성 기술</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">점검</th>
              <th className="w-24 px-3 py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-100 align-top">
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/solutions/${row.id}`}
                    className="font-medium text-ink-900 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={
                        row.kind === 'product'
                          ? 'rounded bg-[var(--color-domain-ai-soft)] px-1.5 py-0.5 font-medium text-[var(--color-domain-ai)]'
                          : 'rounded bg-ink-100 px-1.5 py-0.5 text-ink-600'
                      }
                    >
                      {row.kind === 'product' ? '제품' : '시나리오'}
                    </span>
                    <span className="text-ink-500">{row.industries.join(', ')}</span>
                  </div>
                  <div className="numeric mt-0.5 text-xs text-ink-400">{row.id}</div>
                </td>

                <td className="px-3 py-3 text-xs text-ink-600">
                  {row.stepCount}개
                  {row.visibleStepCount !== row.stepCount ? (
                    <span className="ml-1 text-[var(--color-signal-warn)]">
                      (공개 {row.visibleStepCount}개)
                    </span>
                  ) : null}
                </td>

                <td className="px-3 py-3">
                  <span className={VISIBILITY_BADGE[row.visibility]}>
                    {VISIBILITY_LABELS[row.visibility]}
                  </span>
                </td>

                <td className="px-3 py-3">
                  {row.publishIssues.length > 0 ? (
                    <span className="rounded bg-[var(--color-signal-fail-soft)] px-1.5 py-0.5 text-xs text-[var(--color-signal-fail)]">
                      외부 공개 불가 · {row.publishIssues.join(', ')}
                    </span>
                  ) : row.visibleStepCount === 0 ? (
                    <span className="rounded bg-[var(--color-signal-warn-soft)] px-1.5 py-0.5 text-xs text-[var(--color-signal-warn)]">
                      구성 기술이 모두 비공개
                    </span>
                  ) : (
                    <span className="text-xs text-ink-400">이상 없음</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={`/admin/solutions/${row.id}`}
                      className="text-xs text-ink-600 hover:text-ink-900"
                    >
                      수정
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(row)}
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
