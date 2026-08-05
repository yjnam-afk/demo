'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field, Section, Select, TagList, TextArea, TextInput } from './fields';
import { validateSolutionForPublish } from '@/lib/domain/parse';
import type { Solution } from '@/lib/domain/types';

function blank(): Solution {
  const now = new Date().toISOString();
  return {
    id: '',
    title: '',
    summary: '',
    problem: '',
    industries: [],
    steps: [],
    status: 'draft',
    order: 0,
    created_at: now,
    updated_at: now,
  };
}

export function SolutionForm({
  existing,
  techs,
}: {
  existing: Solution | null;
  /** 구성 기술 후보. 비공개 기술도 고를 수 있지만 공개 화면에서는 그 항목만 빠진다. */
  techs: { id: string; name: string; external: boolean }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Solution>(existing ?? blank());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (patch: Partial<Solution>) => setDraft((prev) => ({ ...prev, ...patch }));
  const issues = useMemo(() => validateSolutionForPublish(draft), [draft]);
  const blocked = issues.length > 0;

  // 비공개 기술만으로 구성하면 공개 화면에서 시나리오가 통째로 사라진다.
  const visibleSteps = draft.steps.filter(
    (step) => techs.find((tech) => tech.id === step.tech_id)?.external,
  );
  const hiddenWarning = draft.steps.length > 0 && visibleSteps.length === 0;

  async function save(status: 'draft' | 'published') {
    if (status === 'published' && blocked) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/solutions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          solution: { ...draft, status },
          mode: existing ? 'update' : 'create',
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: { label: string }[];
      };

      if (!response.ok) {
        const detail = body.issues?.map((issue) => issue.label).join(', ');
        setError(detail ? `${body.error} (${detail})` : (body.error ?? '저장하지 못했습니다.'));
        return;
      }

      router.push('/admin/solutions');
      router.refresh();
    } catch {
      setError('서버에 연결하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  function moveStep(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[index], steps[next]] = [steps[next], steps[index]];
    set({ steps });
  }

  const techOptions = techs.map((tech) => ({
    value: tech.id,
    label: tech.external ? tech.name : `${tech.name} (비공개)`,
  }));

  return (
    <div className="flex flex-col gap-5 pb-32">
      <Section title="기본 정보">
        <Field label="시나리오 id" required hint={existing ? '등록 후에는 바꿀 수 없습니다.' : '영문 소문자·숫자·하이픈'}>
          <TextInput
            value={draft.id}
            disabled={Boolean(existing)}
            placeholder="event-safety"
            onChange={(event) => set({ id: event.target.value })}
          />
        </Field>

        <Field label="시나리오 제목" required>
          <TextInput
            value={draft.title}
            placeholder="대규모 행사장 안전관리"
            onChange={(event) => set({ title: event.target.value })}
          />
        </Field>

        <Field
          label="해결하는 문제"
          required
          hint="기술 설명이 아니라 고객이 겪는 상황을 씁니다. 화면에서 가장 크게 노출됩니다."
        >
          <TextArea
            rows={3}
            value={draft.problem}
            onChange={(event) => set({ problem: event.target.value })}
          />
        </Field>

        <Field label="한 줄 요약" hint="문제 아래에 작게 붙습니다.">
          <TextInput
            value={draft.summary}
            onChange={(event) => set({ summary: event.target.value })}
          />
        </Field>

        <Field label="대상 산업" required hint="최소 1개">
          <TagList
            values={draft.industries}
            placeholder="지자체"
            onChange={(industries) => set({ industries })}
          />
        </Field>
      </Section>

      <Section
        title="구성 기술"
        description="기술은 id 로만 참조합니다. 기술 정보를 수정하면 이 화면에도 그대로 반영됩니다."
      >
        {hiddenWarning ? (
          <p className="rounded border border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)] px-3 py-2 text-sm text-[var(--color-signal-warn)]">
            구성 기술이 모두 비공개입니다. 이대로 발행하면 공개 화면에서 이 시나리오가 보이지 않습니다.
          </p>
        ) : null}

        {draft.steps.map((step, index) => {
          const update = (patch: Partial<typeof step>) => {
            const steps = [...draft.steps];
            steps[index] = { ...steps[index], ...patch };
            set({ steps });
          };

          return (
            <div key={index} className="rounded border border-ink-200 bg-ink-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">구성 {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === draft.steps.length - 1}
                    className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ steps: draft.steps.filter((_, i) => i !== index) })}
                    className="ml-2 text-xs text-[var(--color-signal-fail)] hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Field label="기술" required>
                  <Select
                    value={step.tech_id}
                    placeholder="선택하세요"
                    options={techOptions}
                    onChange={(tech_id) => update({ tech_id })}
                  />
                </Field>
                <Field
                  label="이 시나리오에서의 역할"
                  required
                  hint="카드보다 먼저 읽히는 문장입니다. 이 구성에서 무엇을 맡는지 한 문장으로."
                >
                  <TextArea
                    rows={2}
                    value={step.role}
                    onChange={(event) => update({ role: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => set({ steps: [...draft.steps, { tech_id: '', role: '' }] })}
          className="w-fit rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500"
        >
          + 구성 기술 추가
        </button>
      </Section>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <p className="text-[var(--color-signal-fail)]">{error}</p>
            ) : blocked ? (
              <p className="text-[var(--color-signal-warn)]">
                발행하려면 다음 항목이 필요합니다 · {issues.map((issue) => issue.label).join(', ')}
              </p>
            ) : (
              <p className="text-[var(--color-signal-ok)]">발행 가능한 상태입니다.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void save('draft')}
              className="rounded border border-ink-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-600 disabled:opacity-60"
            >
              임시저장
            </button>
            <button
              type="button"
              disabled={pending || blocked}
              onClick={() => void save('published')}
              className="rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              발행
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
