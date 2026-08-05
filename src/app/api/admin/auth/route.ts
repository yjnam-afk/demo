import { NextResponse } from 'next/server';
import { createSession, destroySession, verifyCredentials } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 로그인 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { user?: string; password?: string };

  let ok: boolean;
  try {
    ok = verifyCredentials(body.user ?? '', body.password ?? '');
  } catch (err) {
    // 환경변수가 없으면 여기서 터진다. 배포 직후 가장 흔한 설정 누락이라
    // 원인 모를 500 대신 무엇이 빠졌는지 알려 준다.
    console.error('[admin] 로그인 설정 오류', err);
    return NextResponse.json(
      { error: '관리자 계정이 설정되지 않았습니다. 서버의 ADMIN_USER / ADMIN_PASSWORD 환경변수를 확인하세요.' },
      { status: 500 },
    );
  }

  if (!ok) {
    // 어느 쪽이 틀렸는지 알려주지 않는다.
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  try {
    await createSession();
  } catch (err) {
    console.error('[admin] 세션 생성 실패', err);
    return NextResponse.json(
      { error: '세션을 만들 수 없습니다. 서버의 SESSION_SECRET 환경변수를 확인하세요.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** 로그아웃 */
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
