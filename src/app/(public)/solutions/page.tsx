import type { Metadata } from 'next';
import Link from 'next/link';
import { TechCard } from '@/components/tech/TechCard';
import { BRAND } from '@/lib/brand';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import type { PublicTech, Solution } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '솔루션 시나리오',
  description: '요소기술을 묶어 현장 문제를 해결하는 구성 예시입니다.',
};

interface ResolvedStep {
  role: string;
  tech: PublicTech;
}

export default async function SolutionsPage() {
  const repo = getRepo();
  const solutions = await repo.listSolutions({ publishedOnly: true });

  /**
   * 구성 기술을 공개 조회로 채운다.
   *
   * 시나리오가 비공개·임시저장 기술을 참조하고 있어도 그 항목만 빠진다.
   * 시나리오 쪽에서 기술 정보를 복사해 두지 않기 때문에 가능한 처리이고,
   * 이렇게 해야 기술 하나를 비공개로 돌렸을 때 시나리오를 통해 새어 나가지 않는다.
   */
  const resolved = await Promise.all(
    solutions.map(async (solution) => {
      const steps = await Promise.all(
        solution.steps.map(async (step) => {
          const tech = await repo.getPublic(step.tech_id);
          return tech ? { role: step.role, tech: toPublicTech(tech) } : null;
        }),
      );
      return {
        solution,
        steps: steps.filter((step): step is ResolvedStep => step !== null),
      };
    }),
  );

  // 구성 기술이 하나도 남지 않은 시나리오는 보여줄 내용이 없다.
  const visible = resolved.filter((item) => item.steps.length > 0);

  return (
    <>
      <section className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-[var(--color-brand-bright)]">
            솔루션 시나리오
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            기술을 묶으면 현장의 문제가 풀립니다
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
            아래는 실제 현장 조건에서 자주 함께 쓰이는 구성입니다. 각 시나리오의 구성 기술은
            개별 성능 지표와 도입 조건을 그대로 확인하실 수 있습니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {visible.length === 0 ? (
          <div className="my-16 rounded-lg border border-dashed border-ink-300 bg-white px-6 py-16 text-center text-sm text-ink-500">
            공개된 시나리오가 없습니다.
          </div>
        ) : (
          visible.map(({ solution, steps }, index) => (
            <ScenarioBlock key={solution.id} solution={solution} steps={steps} index={index} />
          ))
        )}

        <section className="mb-20 rounded-lg bg-ink-950 p-6 sm:p-8">
          <p className="text-lg font-medium text-white">
            현장 조건에 맞는 구성을 함께 설계해 드립니다
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
            {BRAND.contact.promise}
          </p>
          <Link
            href="/#contact"
            className="mt-5 inline-block rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.label}
          </Link>
        </section>
      </div>
    </>
  );
}

function ScenarioBlock({
  solution,
  steps,
  index,
}: {
  solution: Solution;
  steps: ResolvedStep[];
  index: number;
}) {
  return (
    <section className="border-b border-ink-200 py-14 last:border-b-0">
      <div className="flex items-baseline gap-3">
        <span className="numeric text-sm font-semibold text-ink-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">{solution.title}</h2>
      </div>

      {/* 기술 나열보다 문제가 먼저 온다 — 상세 화면과 같은 원칙이다 */}
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-800">{solution.problem}</p>
      {solution.summary ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">{solution.summary}</p>
      ) : null}

      {solution.industries.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">대상</span>
          {solution.industries.map((industry) => (
            <span key={industry} className="rounded bg-ink-100 px-2 py-0.5 text-sm text-ink-700">
              {industry}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <h3 className="text-sm font-medium text-ink-700">구성 기술 {steps.length}개</h3>
        {/* 열 수는 화면 폭이 정한다. 구성 기술이 2개든 5개든 같은 규칙으로 배치된다. */}
        <div className="mt-4 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ role, tech }) => (
            <div key={tech.id} className="flex flex-col gap-2">
              {/* 이 시나리오에서 이 기술이 무엇을 맡는지가 카드보다 먼저 읽혀야 한다 */}
              <p className="text-sm leading-relaxed text-ink-600">{role}</p>
              <div className="flex-1">
                <TechCard tech={tech} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
