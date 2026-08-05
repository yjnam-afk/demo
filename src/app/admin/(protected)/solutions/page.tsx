import Link from 'next/link';
import { SolutionTable, type SolutionRow } from '@/components/admin/SolutionTable';
import { getRepo } from '@/lib/data';
import { validateSolutionForPublish } from '@/lib/domain/parse';
import { isExternallyVisible } from '@/lib/domain/publicView';

export const dynamic = 'force-dynamic';

export default async function AdminSolutionListPage() {
  const repo = getRepo();
  const [solutions, techs] = await Promise.all([repo.listSolutions(), repo.listAll()]);

  const externalIds = new Set(techs.items.filter(isExternallyVisible).map((tech) => tech.id));

  const rows: SolutionRow[] = solutions.map((solution) => ({
    id: solution.id,
    title: solution.title,
    status: solution.status,
    stepCount: solution.steps.length,
    visibleStepCount: solution.steps.filter((step) => externalIds.has(step.tech_id)).length,
    industries: solution.industries,
    publishIssues: validateSolutionForPublish(solution).map((issue) => issue.label),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">솔루션 시나리오</h1>
          <p className="mt-1 text-sm text-ink-500">
            전체 {rows.length}건 · 발행 {rows.filter((row) => row.status === 'published').length}건
          </p>
        </div>
        <Link
          href="/admin/solutions/new"
          className="rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
        >
          시나리오 등록
        </Link>
      </div>

      <div className="mt-6">
        <SolutionTable rows={rows} />
      </div>
    </div>
  );
}
