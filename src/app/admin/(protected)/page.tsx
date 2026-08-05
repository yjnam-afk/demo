import Link from 'next/link';
import { TechTable, type AdminRow } from '@/components/admin/TechTable';
import { getRepo } from '@/lib/data';
import { DEMO_TYPE_LABELS } from '@/lib/domain/enums';
import { collectWarnings, validateForPublish } from '@/lib/domain/validate';

export const dynamic = 'force-dynamic';

export default async function AdminTechListPage() {
  const repo = getRepo();
  const [page, domains] = await Promise.all([repo.listAll(), repo.listDomains()]);
  const domainShort = new Map(domains.map((d) => [d.id, d.short_label]));

  /**
   * 목록에 필요한 값만 골라 내려보낸다.
   * Tech 를 통째로 넘기면 내부망 엔드포인트가 클라이언트 페이로드에 실린다 —
   * 관리자만 보는 화면이라도 굳이 브라우저까지 보낼 이유가 없다.
   */
  const rows: AdminRow[] = page.items.map((tech) => ({
    id: tech.id,
    name: tech.name_ko,
    // 축이 삭제된 뒤 남은 기술은 id 를 그대로 보여준다. 빈칸으로 두면
    // 관리자가 무엇이 잘못됐는지 알 수 없다.
    domain: domainShort.get(tech.domain) ?? tech.domain,
    category: tech.category,
    demoType: DEMO_TYPE_LABELS[tech.demo.type],
    status: tech.status,
    external: tech.visibility.external,
    metricCount: tech.metrics.length,
    health: tech.health ?? null,
    // 데모 서버가 없는 타입은 헬스체크 대상이 아니다.
    hasEndpoint: tech.demo.type === 'api' || tech.demo.type === 'embed',
    warnings: collectWarnings(tech),
    publishIssues: validateForPublish(tech).map((issue) => issue.label),
  }));

  const publishedCount = rows.filter((row) => row.status === 'published').length;
  const blockedCount = rows.filter((row) => row.publishIssues.length > 0).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">기술</h1>
          <p className="mt-1 text-sm text-ink-500">
            전체 {rows.length}건 · 발행 {publishedCount}건
            {blockedCount > 0 ? ` · 발행 불가 ${blockedCount}건` : ''}
          </p>
        </div>
        <Link
          href="/admin/tech/new"
          className="rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
        >
          기술 등록
        </Link>
      </div>

      <div className="mt-6">
        <TechTable rows={rows} />
      </div>
    </div>
  );
}
