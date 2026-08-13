import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { requireAdminApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 기술 삭제 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await context.params;
  const repo = getRepo();

  if (!(await repo.get(id))) {
    return NextResponse.json({ error: '기술을 찾을 수 없습니다.' }, { status: 404 });
  }

  await repo.remove(id);
  // 지운 뒤 실제로 사라졌는지 확인한다 — 조용히 되살아나면 안 된다
  if (await repo.get(id)) {
    return NextResponse.json(
      { error: '삭제가 저장소에 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
