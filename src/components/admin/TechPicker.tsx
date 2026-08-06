'use client';

import { TextArea } from './fields';
import type { SolutionStep } from '@/lib/domain/types';

/**
 * 구성 기술 매핑.
 *
 * 전에는 빈 칸을 하나 만들고 그 안에서 기술을 고르게 했다. 새 항목을 등록하는
 * 것처럼 보여서, 이미 있는 기술을 연결하는 일이라는 게 드러나지 않았다.
 * 기술·제품·산업은 만드는 것이 아니라 잇는 것이다.
 *
 * 그래서 산업군을 고르는 방식과 같게 맞췄다. 전체 기술을 늘어놓고 눌러서
 * 켜고 끄면 곧 매핑이다. 역할 문장은 연결한 뒤에 채운다.
 */
export function TechPicker({
  techs,
  steps,
  onChange,
}: {
  /** 고를 수 있는 전체 기술. 비공개 기술도 고를 수 있으나 공개 화면에서는 빠진다. */
  techs: { id: string; name: string; external: boolean }[];
  steps: SolutionStep[];
  onChange: (next: SolutionStep[]) => void;
}) {
  const selected = new Map(steps.map((step, index) => [step.tech_id, index]));

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(steps.filter((step) => step.tech_id !== id));
    } else {
      onChange([...steps, { tech_id: id, role: '' }]);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= steps.length) return;
    const list = [...steps];
    [list[index], list[next]] = [list[next], list[index]];
    onChange(list);
  }

  function setRole(index: number, role: string) {
    onChange(steps.map((step, i) => (i === index ? { ...step, role } : step)));
  }

  const byId = new Map(techs.map((tech) => [tech.id, tech]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {techs.map((tech) => {
          const active = selected.has(tech.id);
          return (
            <button
              key={tech.id}
              type="button"
              onClick={() => toggle(tech.id)}
              className={
                active
                  ? 'rounded border border-ink-800 bg-ink-800 px-3 py-1.5 text-sm text-white'
                  : 'rounded border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-ink-500'
              }
            >
              {tech.name}
              {!tech.external ? (
                <span className={active ? 'ml-1.5 text-xs text-ink-300' : 'ml-1.5 text-xs text-ink-400'}>
                  비공개
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-ink-400">위에서 기술을 골라 연결하세요.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const tech = byId.get(step.tech_id);
            return (
              <li key={step.tech_id} className="rounded border border-ink-200 bg-ink-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-800">
                    <span className="numeric mr-2 text-ink-400">{index + 1}</span>
                    {tech?.name ?? step.tech_id}
                    {tech && !tech.external ? (
                      <span className="ml-2 text-xs text-ink-500">비공개</span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* 순서가 공개 화면의 단계 번호가 된다 */}
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                      aria-label="위로"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === steps.length - 1}
                      className="rounded border border-ink-300 px-1.5 text-xs text-ink-600 hover:border-ink-500 disabled:opacity-30"
                      aria-label="아래로"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(step.tech_id)}
                      className="ml-2 text-xs text-ink-500 hover:text-[var(--color-signal-fail)]"
                    >
                      연결 해제
                    </button>
                  </div>
                </div>

                <TextArea
                  rows={2}
                  value={step.role}
                  placeholder="이 단계에서 무엇을 맡는지 한 문장으로"
                  onChange={(event) => setRole(index, event.target.value)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
