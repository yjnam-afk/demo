import { NextResponse } from 'next/server';
import { createSession, destroySession, verifyCredentials } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 로그인 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { user?: string; password?: string };

  if (!verifyCredentials(body.user ?? '', body.password ?? '')) {
    // 어느 쪽이 틀렸는지 알려주지 않는다.
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}

/** 로그아웃 */
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
