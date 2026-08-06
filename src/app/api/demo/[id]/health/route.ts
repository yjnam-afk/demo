import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { checkHealth } from '@/lib/demo/gradio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 데모 엔드포인트 생존 확인.
 *
 * embed 화면이 iframe 을 붙이기 전에 부른다. iframe 은 교차 문서라 로드 실패를
 * onerror 로 알려주지 않고, 프록시가 돌려준 502 오류 문서조차 "정상 로드"로
 * 처리하기 때문에, 서버에 먼저 물어보지 않으면 방문자는 빈 상자를 보게 된다.
 *
 * 관리자 목록의 상태 표시도 같은 함수를 쓴다.
 * 응답에는 상태만 담는다 — 내부 주소도 실패 원인 문자열도 내보내지 않는다.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const tech = await getRepo().getShareable(id);
  if (!tech) {
    return NextResponse.json({ status: 'fail' }, { status: 404 });
  }

  const result = await checkHealth(tech);
  return NextResponse.json({ status: result.status }, { headers: { 'cache-control': 'no-store' } });
}
