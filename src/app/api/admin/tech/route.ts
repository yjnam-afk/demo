import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { errorDetail, ReadOnlyStoreError } from '@/lib/data/store';
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
     * 수정 대상은 원래 id 로 찾는다.
     *
     * id 를 바꿔 저장하는 경우, 새 id 로 조회하면 아무것도 안 나와 신규
     * 등록으로 취급되고 같은 기술이 둘로 늘어난다.
     *
     * 옛 id 로도 안 나오면 새 id 로 한 번 더 찾는다 — 이전 저장이 id 변경까지
     * 하고 검증에서 막힌 적이 있으면, 화면은 아직 옛 id 를 원본으로 알고
     * 있지만 저장소는 이미 새 id 다. 그때 "찾을 수 없습니다" 로 끝내면
     * 관리자는 저장할 길이 없어진다.
     */
    const originalId = typeof body.originalId === 'string' ? body.originalId : '';
    const lookupId = body.mode === 'update' ? originalId || incomingId : incomingId;
    let existing = lookupId ? await repo.get(lookupId) : null;
    if (!existing && body.mode === 'update' && incomingId && incomingId !== lookupId) {
      existing = await repo.get(incomingId);
    }

    if (body.mode === 'update' && !existing) {
      return NextResponse.json(
        { error: `수정할 기술을 찾을 수 없습니다: ${lookupId}` },
        { status: 404 },
      );
    }
    if (body.mode === 'create' && incomingId && (await repo.get(incomingId))) {
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

    /*
     * id 변경은 모든 검증을 통과한 뒤에만 실행한다.
     *
     * 검증 앞에 두면 검증이 막았을 때 id 만 바뀐 반쪽 저장이 남는다 — 화면은
     * 옛 id 를 원본으로 알고 있는데 저장소는 새 id 라, 다음 저장부터
     * "찾을 수 없습니다" 로 막히는 상태가 됐다.
     */
    if (body.mode === 'update' && existing && incomingId && existing.id !== incomingId) {
      try {
        const renamed = await repo.rename(existing.id, incomingId);
        // 옛 id 이력은 rename 이 만든다. parse 는 rename 전의 existing 을 보고
        // 있어서, 이걸 옮겨 주지 않으면 다음 줄의 저장이 이력을 지워 버리고
        // 이미 나간 옛 주소 링크가 끊긴다.
        tech.previous_ids = renamed.previous_ids;
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 409 });
      }
    }

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
    return NextResponse.json(
      { error: '저장하지 못했습니다.', detail: errorDetail(err) },
      { status: 500 },
    );
  }
}
