import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { toPublicTech } from '@/lib/domain/publicView';
import { parseTechQuery } from '@/lib/ui/query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 카탈로그 "더보기"용 공개 조회.
 * listPublic 이 비공개·임시저장 기술을 조회 단계에서 제외하고,
 * toPublicTech 가 내부 엔드포인트를 제거한 뒤 응답한다.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = parseTechQuery(params);

  const page = await getRepo().listPublic(query);

  return NextResponse.json({
    items: page.items.map(toPublicTech),
    total: page.total,
    hasMore: page.hasMore,
  });
}
