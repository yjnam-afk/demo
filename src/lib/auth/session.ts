import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * 관리자 단일 계정 세션.
 *
 * 사용자 테이블도 권한 체계도 두지 않는다. 요구사항이 "단일 관리자 계정 수준의
 * 간단한 세션 인증"이므로, 서명된 만료 시각만 담은 쿠키로 충분하다.
 * 쿠키에는 비밀번호도 사용자명도 넣지 않는다 — 만료 시각과 그 서명뿐이다.
 */

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error('SESSION_SECRET 환경변수가 필요합니다. .env.local 을 확인하세요.');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** 길이가 달라도 예외 없이 false 를 돌려주는 상수 시간 비교 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** 아이디·비밀번호 확인. 둘 다 상수 시간으로 비교해 응답 시간으로 추측당하지 않게 한다. */
export function verifyCredentials(user: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    throw new Error('ADMIN_USER / ADMIN_PASSWORD 환경변수가 필요합니다.');
  }
  // 짧은 회로로 빠져나가지 않도록 두 비교를 모두 수행한 뒤 결합한다.
  const userOk = safeEqual(user, expectedUser);
  const passwordOk = safeEqual(password, expectedPassword);
  return userOk && passwordOk;
}

export async function createSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const store = await cookies();

  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const separator = raw.lastIndexOf('.');
  if (separator === -1) return false;

  const payload = raw.slice(0, separator);
  const mac = raw.slice(separator + 1);
  if (!safeEqual(mac, sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
