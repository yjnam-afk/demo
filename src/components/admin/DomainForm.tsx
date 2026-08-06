'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Row, Section, Select, TextArea, TextInput } from './fields';
import { ACCENTS, ACCENT_LABELS, type Accent } from '@/lib/domain/enums';
import type { DomainDef } from '@/lib/domain/types';
import { accentStyle, cn } from '@/lib/ui/domain';

/**
 * 대분류(축) 관리.
 *
 * 축은 다른 마스터와 성격이 다르다. 산업군은 라벨만 바꾸면 되지만 축은
 * 랜딩의 축 카드, 카드의 색 점, 필터 칩까지 좌우한다. 그래서 항목을 하나씩
 * 추가하는 방식이 아니라 목록 전체를 편집하고 한 번에 저장한다 — 순서가
 * 곧 화면 배열이라 순서 변경과 내용 수정이 같은 저장에 묶이는 편이
 * 화면과 데이터가 어긋날 여지가 적다.
 */
function blank(index: number): DomainDef {
  return {
    id: '',
    label: '',
    short_label: '',
    lead: '',
    description: '',
    accent: ACCENTS[index % ACCENTS.length],
    order: index,
  };
}

export function DomainForm({
  initial,
  usage,
}: {
  initial: DomainDef[];
  /** 축 id → 이 축을 쓰는 기술 수. 삭제 가능 여부를 미리 알려 준다. */
  usage: Record<string, number>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DomainDef[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function patch(index: number, next: Partial<DomainDef>) {
    setSaved(false);
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setSaved(false);
    setItems((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function remove(index: number) {
    const item = items[index];
    const used = usage[item.id] ?? 0;

    // 저장되지 않은 새 행은 서버에 없으므로 그냥 지운다.
    if (!item.id || !initial.some((d) => d.id === item.id)) {
      setItems((list) => list.filter((_, i) => i !== index));
      return;
    }

    if (used > 0) {
      setError(`"${item.label}" 을(를) 쓰는 기술이 ${used}건 있습니다. 먼저 다른 대분류로 옮기세요.`);
      return;
    }
    if (!confirm(`"${item.label}" 대분류를 삭제할까요?`)) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/domains?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      });
      const body = (await response.json().catch(() => ({}))) as {
        domains?: DomainDef[];
        error?: string;
      };
      if (!response.ok || !body.domains) {
        setError(body.error ?? '삭제하지 못했습니다.');
        return;
      }
      setItems(body.domains);
      router.refresh();
    } catch {
      setError('서버에 연결하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/domains', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domains: items }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        domains?: DomainDef[];
        error?: string;
      };
      if (!response.ok || !body.domains) {
        setError(body.error ?? '저장하지 못했습니다.');
        return;
      }
      setItems(body.domains);
      setSaved(true);
      router.refresh();
    } catch {
      setError('서버에 연결하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-32">
      {items.map((item, index) => {
        const style = accentStyle(item.accent);
        const used = usage[item.id] ?? 0;
        const isNew = !initial.some((d) => d.id === item.id);

        return (
          <Section
            key={index}
            title={item.label || `대분류 ${index + 1}`}
            action={
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-400">
                  {isNew ? '저장 전' : used > 0 ? `기술 ${used}건` : '사용 안 함'}
                </span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded border border-ink-300 px-2 py-1 text-ink-600 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="rounded border border-ink-300 px-2 py-1 text-ink-600 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded border border-ink-300 px-2 py-1 text-ink-600 hover:border-[var(--color-signal-bad)] hover:text-[var(--color-signal-bad)]"
                >
                  삭제
                </button>
              </div>
            }
          >
            <Row>
              <Field
                label="id"
                required
                hint={isNew ? 'URL 에 쓰입니다. 저장 후에는 바꾸지 마세요.' : '기술이 이 값을 참조합니다.'}
              >
                <TextInput
                  value={item.id}
                  placeholder="digital_twin"
                  onChange={(event) => patch(index, { id: event.target.value })}
                />
              </Field>
              <Field label="이름" required hint="필터와 상세에 쓰입니다.">
                <TextInput
                  value={item.label}
                  placeholder="디지털 트윈"
                  onChange={(event) => patch(index, { label: event.target.value })}
                />
              </Field>
            </Row>

            <Row>
              <Field label="짧은 이름" hint="카드처럼 좁은 자리에 쓰입니다. 비우면 이름을 그대로 씁니다.">
                <TextInput
                  value={item.short_label}
                  placeholder="디지털트윈"
                  onChange={(event) => patch(index, { short_label: event.target.value })}
                />
              </Field>
              <Field label="강조색" hint="정해진 색에서만 고를 수 있습니다.">
                <div className="flex items-center gap-2">
                  <span className={cn('h-6 w-6 shrink-0 rounded', style.bar)} />
                  <Select
                    value={item.accent}
                    options={ACCENTS.map((a) => ({ value: a, label: ACCENT_LABELS[a] }))}
                    onChange={(accent: Accent) => patch(index, { accent })}
                  />
                </div>
              </Field>
            </Row>

            <Field
              label="한 줄 소개"
              hint="기술이 하는 일만 씁니다. 산업이나 제품은 각각 다른 화면이 맡습니다."
            >
              <TextInput
                value={item.lead}
                placeholder="실물의 상태를 화면 안에서 재현합니다"
                onChange={(event) => patch(index, { lead: event.target.value })}
              />
            </Field>

            <Field
              label="구성 설명"
              hint="어떤 데이터를 어떤 방법으로 다루는지. 위 한 줄을 다시 풀어 쓰거나 적용 사례를 들지 않습니다."
            >
              <TextArea
                rows={2}
                value={item.description}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
            </Field>
          </Section>
        );
      })}

      <button
        type="button"
        onClick={() => setItems((list) => [...list, blank(list.length)])}
        className="rounded border border-dashed border-ink-300 px-4 py-3 text-sm text-ink-600 hover:border-ink-500 hover:text-ink-900"
      >
        + 대분류 추가
      </button>

      {/* 저장 막대 — 기술 등록 화면과 같은 위치에 둔다 */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ink-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm">
            {error ? (
              <span className="text-[var(--color-signal-bad)]">{error}</span>
            ) : saved ? (
              <span className="text-[var(--color-signal-ok)]">저장했습니다.</span>
            ) : (
              <span className="text-ink-500">
                순서가 그대로 공개 화면의 축 카드 순서가 됩니다.
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-ink-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
