import { redirect } from 'next/navigation';

/**
 * 임시 — 메인 랜딩은 3단계에서 만든다.
 * 그때까지 루트 진입은 카탈로그로 보낸다.
 */
export default function HomePage() {
  redirect('/tech');
}
