import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { requireAdminApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 시나리오 삭제 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await context.params;
  const repo = getRepo();

  if (!(await repo.getSolution(id))) {
    return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 });
  }

  await repo.removeSolution(id);
  return NextResponse.json({ ok: true });
}
