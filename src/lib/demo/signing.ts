import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 데모 결과 파일 중계용 서명.
 *
 * Gradio 는 결과 파일을 내부망 URL 로 돌려준다. 그 URL 을 그대로 클라이언트에
 * 넘기면 내부 주소가 노출되므로 우리 서버가 중계한다. 다만 임의 URL 을 받아
 * 중계하면 SSRF 통로가 되므로, 서버가 직접 만든 참조에만 서명을 붙이고
 * 중계 시점에 서명과 기술 id 를 함께 검증한다.
 */

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error('SESSION_SECRET 환경변수가 필요합니다. .env.local 을 확인하세요.');
  }
  return value;
}

export function signFileRef(techId: string, url: string): string {
  const payload = Buffer.from(JSON.stringify({ techId, url })).toString('base64url');
  const mac = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifyFileRef(techId: string, ref: string): string | null {
  const [payload, mac] = ref.split('.');
  if (!payload || !mac) return null;

  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    // 서명이 유효해도 다른 기술의 참조를 끌어오지 못하도록 id 를 대조한다.
    if (parsed.techId !== techId) return null;
    return typeof parsed.url === 'string' ? parsed.url : null;
  } catch {
    return null;
  }
}
