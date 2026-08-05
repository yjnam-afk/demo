import 'server-only';
import { NextResponse } from 'next/server';
import { isAuthenticated } from './session';

/**
 * 관리자 API 라우트의 공통 관문.
 *
 * 화면(레이아웃)과 API 를 각각 막는다. 화면만 막으면 라우트를 직접 호출해
 * 우회할 수 있고, API 만 막으면 로그인하지 않은 사람에게 관리 화면이 그려진다.
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
}
