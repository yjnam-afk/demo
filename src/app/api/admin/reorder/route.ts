import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { requireAdminApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 노출 순서 변경.
 * 이 순서가 카탈로그 정렬뿐 아니라 랜딩의 히어로·대표 기술 선정까지 정한다.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'ids 는 문자열 배열이어야 합니다.' }, { status: 400 });
  }

  await getRepo().reorder(body.ids as string[]);
  return NextResponse.json({ ok: true });
}
