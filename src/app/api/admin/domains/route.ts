import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { ReadOnlyStoreError } from '@/lib/data/jsonRepository';
import { requireAdminApi } from '@/lib/auth/guard';
import { InvalidInputError, parseDomainList } from '@/lib/domain/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 대분류 마스터 저장.
 *
 * 산업군·카테고리와 달리 항목 추가가 아니라 목록 전체를 받는다. 축은
 * 순서까지 화면에 그대로 드러나므로(랜딩의 축 카드 배열), 순서 변경과
 * 내용 수정을 한 번의 저장으로 처리하는 편이 화면과 데이터가 어긋날 여지가
 * 적다.
 */
export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { domains?: unknown };

  try {
    const parsed = parseDomainList(body.domains);
    const domains = await getRepo().saveDomains(parsed);
    return NextResponse.json({ domains });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('[admin] 대분류 저장 실패', err);
    return NextResponse.json({ error: '대분류를 저장하지 못했습니다.' }, { status: 500 });
  }
}

/**
 * 대분류 삭제.
 *
 * 사용 중인 축을 지우면 그 기술들이 필터에서도 축 카드에서도 빠져 관리자에게만
 * 보이는 유령이 된다. 저장소가 사용 건수를 세서 막고, 여기서는 몇 건이
 * 걸려 있는지 그대로 알려 준다 — "삭제할 수 없습니다" 만으로는 무엇을
 * 옮겨야 하는지 알 수 없다.
 */
export async function DELETE(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id) {
    return NextResponse.json({ error: '삭제할 대분류를 지정해야 합니다.' }, { status: 400 });
  }

  try {
    const repo = getRepo();
    const all = await repo.listDomains();
    if (all.length <= 1) {
      return NextResponse.json(
        { error: '대분류는 최소 1개가 있어야 합니다.' },
        { status: 400 },
      );
    }

    const result = await repo.removeDomain(id);
    if (!result.removed) {
      return NextResponse.json(
        { error: `이 대분류를 쓰는 기술이 ${result.usedBy}건 있습니다. 먼저 다른 대분류로 옮기세요.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ domains: await repo.listDomains() });
  } catch (err) {
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('[admin] 대분류 삭제 실패', err);
    return NextResponse.json({ error: '대분류를 삭제하지 못했습니다.' }, { status: 500 });
  }
}
