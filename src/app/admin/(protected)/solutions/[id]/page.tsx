import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SolutionForm } from '@/components/admin/SolutionForm';
import { getRepo } from '@/lib/data';

export const dynamic = 'force-dynamic';

const NEW = 'new';

export default async function AdminSolutionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepo();

  const [existing, techs, industries] = await Promise.all([
    id === NEW ? Promise.resolve(null) : repo.getSolution(id),
    repo.listAll(),
    repo.listIndustries(),
  ]);

  if (id !== NEW && !existing) notFound();

  const options = techs.items.map((tech) => ({
    id: tech.id,
    name: tech.name_ko,
    external: tech.status === 'published' && tech.visibility.external,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">
            {existing ? existing.title : '제품 · 구성 제안 등록'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            기술을 묶어 하나의 사업 제안으로 만드는 화면입니다. 제품과 구성 제안을 함께 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {existing?.status === 'published' ? (
            <Link
              href={existing.kind === 'product' ? `/products/${existing.id}` : '/solutions'}
              target="_blank"
              className="text-ink-500 hover:text-ink-900"
            >
              공개 화면 보기 ↗
            </Link>
          ) : null}
          <Link href="/admin/solutions" className="text-ink-500 hover:text-ink-900">
            목록으로
          </Link>
        </div>
      </div>

      <SolutionForm existing={existing} techs={options} industries={industries} />
    </div>
  );
}
