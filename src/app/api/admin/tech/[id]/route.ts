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
  return NextResponse.json({ ok: true });
}
