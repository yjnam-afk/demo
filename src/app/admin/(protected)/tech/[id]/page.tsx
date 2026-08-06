import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TechForm } from '@/components/admin/TechForm';
import { getRepo } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** id 가 new 면 신규 등록 화면이다. */
const NEW = 'new';

export default async function AdminTechFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepo();

  const [existing, categories, industries, domains, all] = await Promise.all([
    id === NEW ? Promise.resolve(null) : repo.get(id),
    repo.listCategories(),
    repo.listIndustries(),
    repo.listDomains(),
    repo.listAll(),
  ]);

  if (id !== NEW && !existing) notFound();

  // 자기 자신은 연계 기술 후보에서 제외한다.
  const otherTechs = all.items
    .filter((tech) => tech.id !== id)
    .map((tech) => ({ id: tech.id, name: tech.name_ko }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">
            {existing ? existing.name_ko : '기술 등록'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {existing ? '수정 후 공개 범위를 골라 저장하세요.' : '필수 항목을 채우면 외부 공개할 수 있습니다.'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {existing?.visibility === 'public' ? (
            <Link
              href={`/tech/${existing.id}`}
              target="_blank"
              className="text-ink-500 hover:text-ink-900"
            >
              공개 화면 보기 ↗
            </Link>
          ) : null}
          <Link href="/admin" className="text-ink-500 hover:text-ink-900">
            목록으로
          </Link>
        </div>
      </div>

      <TechForm
        existing={existing}
        categories={categories}
        industries={industries}
        domains={domains}
        otherTechs={otherTechs}
      />
    </div>
  );
}
