'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field, Row, Section, Select, TextArea, TextInput } from './fields';
import { IndustryPicker } from './IndustryPicker';
import { validateSolutionForPublish } from '@/lib/domain/parse';
import {
  DEPLOYMENTS,
  DEPLOYMENT_LABELS,
  OFFERING_KINDS,
  OFFERING_KIND_LABELS,
  RELEASE_STAGES,
  RELEASE_STAGE_LABELS,
  VISIBILITY_HINTS,
  type Deployment,
  type Visibility,
} from '@/lib/domain/enums';
import type { Industry, Solution } from '@/lib/domain/types';

function blank(): Solution {
  const now = new Date().toISOString();
  return {
    id: '',
    kind: 'product',
    title: '',
    summary: '',
    problem: '',
    industries: [],
    steps: [],
    visibility: 'draft',
    order: 0,
    created_at: now,
    updated_at: now,
  };
}

export function SolutionForm({
  existing,
  techs,
  industries: initialIndustries,
}: {
  existing: Solution | null;
  /** 구성 기술 후보. 비공개 기술도 고를 수 있지만 공개 화면에서는 그 항목만 빠진다. */
  techs: { id: string; name: string; external: boolean }[];
  industries: Industry[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Solution>(existing ?? blank());
  const [industries, setIndustries] = useState(initialIndustries);
  const isProduct = draft.kind === 'product';
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

  async function save(visibility: Visibility) {
    if (visibility === 'public' && blocked) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/solutions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          solution: { ...draft, visibility },
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
        <Field
          label="종류"
          required
          hint="제품은 실제로 파는 단위, 시나리오는 아직 제품화되지 않은 제안형 조합입니다."
        >
          <Select
            value={draft.kind}
            options={OFFERING_KINDS.map((value) => ({
              value,
              label: OFFERING_KIND_LABELS[value],
            }))}
            onChange={(kind) => set({ kind })}
          />
        </Field>

        <Field label={isProduct ? '제품 id' : '항목 id'} required hint={existing ? '등록 후에는 바꿀 수 없습니다.' : '영문 소문자·숫자·하이픈'}>
          <TextInput
            value={draft.id}
            disabled={Boolean(existing)}
            placeholder={isProduct ? 'heidi-ai-guard' : 'event-safety'}
            onChange={(event) => set({ id: event.target.value })}
          />
        </Field>

        <Field label={isProduct ? '제품명' : '제목'} required>
          <TextInput
            value={draft.title}
            placeholder={isProduct ? 'HEIDI AI Guard' : '대규모 행사장 안전관리'}
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

        <Field label="산업군" required hint="최소 1개. 목록에 없으면 아래에서 먼저 만드세요.">
          <IndustryPicker
            industries={industries}
            selected={draft.industries}
            onChange={(next) => set({ industries: next })}
            onAdded={setIndustries}
          />
        </Field>

        {isProduct ? (
          <Row>
            <Field label="출시 단계">
              <Select
                value={draft.release ?? ''}
                placeholder="선택하세요"
                options={RELEASE_STAGES.map((value) => ({
                  value,
                  label: RELEASE_STAGE_LABELS[value],
                }))}
                onChange={(release) => set({ release })}
              />
            </Field>
            <Field label="배포 형태">
              <div className="flex flex-wrap gap-2 pt-1.5">
                {DEPLOYMENTS.map((value) => {
                  const active = draft.deployment?.includes(value) ?? false;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        set({
                          deployment: active
                            ? (draft.deployment ?? []).filter((d) => d !== value)
                            : [...(draft.deployment ?? []), value as Deployment],
                        })
                      }
                      className={
                        active
                          ? 'rounded border border-ink-700 bg-ink-700 px-3 py-1.5 text-sm text-white'
                          : 'rounded border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500'
                      }
                    >
                      {DEPLOYMENT_LABELS[value]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Row>
        ) : null}
      </Section>

      <Section
        title="구성 기술"
        description="기술은 id 로만 참조합니다. 기술 정보를 수정하면 이 화면에도 그대로 반영됩니다."
      >
        {hiddenWarning ? (
          <p className="rounded border border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)] px-3 py-2 text-sm text-[var(--color-signal-warn)]">
            구성 기술이 모두 비공개입니다. 이대로 외부 공개하면 공개 화면에서 보이지 않습니다.
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
                외부 공개하려면 다음 항목이 필요합니다 ·{' '}
                {issues.map((issue) => issue.label).join(', ')}
              </p>
            ) : (
              <p className="text-ink-500">{VISIBILITY_HINTS[draft.visibility]}</p>
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
              disabled={pending}
              onClick={() => void save('internal')}
              className="rounded border border-ink-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-600 disabled:opacity-60"
            >
              내부 공개
            </button>
            <button
              type="button"
              disabled={pending || blocked}
              onClick={() => void save('public')}
              className="rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              외부 공개
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
