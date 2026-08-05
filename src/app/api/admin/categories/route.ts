import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { requireAdminApi } from '@/lib/auth/guard';
import { DOMAINS, isOneOf } from '@/lib/domain/enums';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 하위 카테고리 신규 생성.
 *
 * 등록 폼에서는 기존 목록에서 고르는 것이 기본이고, 새로 만드는 것은 이 라우트를
 * 거치는 별도 동작이다. 카테고리를 자유 입력으로 두면 "이상행동인지"와
 * "이상 행동 인지"가 따로 쌓여 필터가 무의미해진다.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { domain?: unknown; name?: unknown };

  if (!isOneOf(DOMAINS, body.domain)) {
    return NextResponse.json({ error: '대분류를 먼저 선택해야 합니다.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: '카테고리명을 입력해야 합니다.' }, { status: 400 });
  }

  const categories = await getRepo().addCategory(body.domain, name);
  return NextResponse.json({ categories });
}
