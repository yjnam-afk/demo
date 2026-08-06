import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { ReadOnlyStoreError } from '@/lib/data/store';
import { requireAdminApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 산업군 신규 생성.
 *
 * 카테고리와 같은 규칙이다 — 폼에서는 마스터 목록에서 고르는 것이 기본이고,
 * 새로 만드는 것은 이 라우트를 거치는 별도 동작으로 분리한다.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as {
    label?: unknown;
    description?: unknown;
  };

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    return NextResponse.json({ error: '산업군 이름을 입력해야 합니다.' }, { status: 400 });
  }

  try {
    const industries = await getRepo().addIndustry(
      label,
      typeof body.description === 'string' ? body.description : undefined,
    );
    return NextResponse.json({ industries });
  } catch (err) {
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('[admin] 산업군 추가 실패', err);
    return NextResponse.json({ error: '산업군을 추가하지 못했습니다.' }, { status: 500 });
  }
}
