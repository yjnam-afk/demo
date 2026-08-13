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

  /*
    지운 뒤 실제로 사라졌는지 확인한다.

    삭제가 조용히 되돌아온 적이 있다 — 저장은 됐는데 다음 읽기가 실패해
    배포본(시드)으로 떨어지면서 지운 항목이 되살아났다. 그 원인은 읽기
    경로에서 고쳤지만, 다시 같은 일이 생기면 화면이 "삭제됨" 이라고
    말하는 대신 실패를 알려야 한다.
  */
  if (await repo.getSolution(id)) {
    return NextResponse.json(
      { error: '삭제가 저장소에 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
