import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { requireAdminApi } from '@/lib/auth/guard';
import { checkHealth } from '@/lib/demo/gradio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 데모 엔드포인트 재확인.
 * 목록 화면은 저장된 결과를 보여주고, 관리자가 원할 때 이 라우트로 다시 찍는다.
 * 목록 진입마다 전 기술의 엔드포인트를 두드리면 모델 서버에 부담이 간다.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await context.params;
  const repo = getRepo();

  const tech = await repo.get(id);
  if (!tech) return NextResponse.json({ error: '기술을 찾을 수 없습니다.' }, { status: 404 });

  const result = await checkHealth(tech);
  const health = { ...result, checked_at: new Date().toISOString() };
  await repo.saveHealth(id, health);

  return NextResponse.json({ health });
}
