import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { ReadOnlyStoreError } from '@/lib/data/store';
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
    const body = (await request.json()) as {
      tech?: unknown;
      mode?: 'create' | 'update';
      /** 수정 화면에서 id 를 바꾼 경우의 원래 id */
      originalId?: string;
    };
    const incomingId = (body.tech as { id?: string } | undefined)?.id;

    /**
     * id 변경은 저장 전에 처리한다.
     *
     * 새 id 로 조회하면 아무것도 안 나와 신규 등록으로 취급되고, 같은 기술이
     * 둘로 늘면서 옛 레코드를 아무도 가리키지 않게 된다. 먼저 이름을 옮겨
     * 참조까지 정리한 뒤에 나머지 항목을 저장한다.
     */
    const originalId = typeof body.originalId === 'string' ? body.originalId : '';
    if (body.mode === 'update' && originalId && incomingId && originalId !== incomingId) {
      try {
        await repo.rename(originalId, incomingId);
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      }
    }

    const existing = incomingId ? await repo.get(incomingId) : null;

    if (body.mode === 'create' && existing) {
      return NextResponse.json({ error: `이미 존재하는 id 입니다: ${incomingId}` }, { status: 409 });
    }

    // 대분류는 마스터 데이터라 parse 가 혼자 검증할 수 없다. 등록된 축
    // 목록을 넘겨 임의 문자열이 들어오는 것을 막는다.
    const allowedDomains = (await repo.listDomains()).map((d) => d.id);
    const tech = parseTechInput(body.tech, existing, allowedDomains);

    // 링크 공개도 고객이 보는 화면이라 같은 조건을 건다. 다른 것은 목록에
    // 실리는지 여부뿐이다.
    if (tech.visibility === 'public' || tech.visibility === 'link') {
      const issues = validateForPublish(tech);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: '외부 공개에 필요한 항목이 비어 있습니다.', issues },
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
