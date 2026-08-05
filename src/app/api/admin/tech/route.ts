import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { ReadOnlyStoreError } from '@/lib/data/jsonRepository';
import { requireAdminApi } from '@/lib/auth/guard';
import { InvalidInputError, parseTechInput } from '@/lib/domain/parse';
import { validateForPublish } from '@/lib/domain/validate';
import { checkHealth } from '@/lib/demo/gradio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 기술 등록·수정.
 *
 * 발행 게이트를 서버에서 다시 검사한다. 화면의 버튼 비활성화만으로 막으면
 * 요청을 직접 보내 우회할 수 있고, 그렇게 들어온 항목이 곧바로 영업 화면에
 * 빈 카드로 노출된다.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const repo = getRepo();

  try {
    const body = (await request.json()) as { tech?: unknown; mode?: 'create' | 'update' };
    const incomingId = (body.tech as { id?: string } | undefined)?.id;
    const existing = incomingId ? await repo.get(incomingId) : null;

    if (body.mode === 'create' && existing) {
      return NextResponse.json({ error: `이미 존재하는 id 입니다: ${incomingId}` }, { status: 409 });
    }

    const tech = parseTechInput(body.tech, existing);

    if (tech.status === 'published') {
      const issues = validateForPublish(tech);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: '발행에 필요한 항목이 비어 있습니다.', issues },
          { status: 422 },
        );
      }
    }

    // 등록·수정 시 1회 헬스체크. 목록 화면은 이때 저장된 결과를 보여준다.
    const health = await checkHealth(tech);
    tech.health = { ...health, checked_at: new Date().toISOString() };

    const saved = existing ? await repo.update(tech.id, tech) : await repo.create(tech);
    return NextResponse.json({ tech: saved });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('[admin] 기술 저장 실패', err);
    return NextResponse.json({ error: '저장하지 못했습니다.' }, { status: 500 });
  }
}
