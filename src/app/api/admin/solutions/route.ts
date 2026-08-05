import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { ReadOnlyStoreError } from '@/lib/data/jsonRepository';
import { requireAdminApi } from '@/lib/auth/guard';
import {
  InvalidInputError,
  parseSolutionInput,
  validateSolutionForPublish,
} from '@/lib/domain/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 시나리오 등록·수정 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const repo = getRepo();

  try {
    const body = (await request.json()) as { solution?: unknown; mode?: 'create' | 'update' };
    const incomingId = (body.solution as { id?: string } | undefined)?.id;
    const existing = incomingId ? await repo.getSolution(incomingId) : null;

    if (body.mode === 'create' && existing) {
      return NextResponse.json({ error: `이미 존재하는 id 입니다: ${incomingId}` }, { status: 409 });
    }

    const solution = parseSolutionInput(body.solution, existing);

    // 기술과 마찬가지로 발행 조건을 서버에서 다시 검사한다.
    if (solution.status === 'published') {
      const issues = validateSolutionForPublish(solution);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: '발행에 필요한 항목이 비어 있습니다.', issues },
          { status: 422 },
        );
      }
    }

    const saved = await repo.upsertSolution(solution);
    return NextResponse.json({ solution: saved });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('[admin] 시나리오 저장 실패', err);
    return NextResponse.json({ error: '저장하지 못했습니다.' }, { status: 500 });
  }
}
