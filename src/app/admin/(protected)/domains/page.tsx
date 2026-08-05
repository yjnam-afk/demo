import Link from 'next/link';
import { DomainForm } from '@/components/admin/DomainForm';
import { getRepo } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminDomainsPage() {
  const repo = getRepo();
  const [domains, all] = await Promise.all([repo.listDomains(), repo.listAll()]);

  // 축마다 몇 건이 걸려 있는지 미리 센다. 삭제를 눌러 보고 나서야 막히는 것보다
  // 화면에서 먼저 보이는 편이 낫다.
  const usage: Record<string, number> = {};
  for (const tech of all.items) {
    usage[tech.domain] = (usage[tech.domain] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">대분류</h1>
          <p className="mt-1 text-sm text-ink-500">
            기술을 나누는 축입니다. 이름과 설명, 색, 순서가 공개 화면의 축 카드와 필터에 그대로
            반영됩니다.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-900">
          기술 목록으로
        </Link>
      </div>

      <DomainForm initial={domains} usage={usage} />
    </div>
  );
}
