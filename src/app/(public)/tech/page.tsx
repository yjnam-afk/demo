import { permanentRedirect } from 'next/navigation';
import { toSearchParams } from '@/lib/ui/query';

/**
 * 메인이 곧 카탈로그가 되면서 /tech 는 주소만 남았다.
 * 이미 나간 QR·영업 링크(/tech?domain=… 포함)를 깨뜨리지 않도록
 * 필터 파라미터를 그대로 승계해 루트로 넘긴다.
 */
export const dynamic = 'force-dynamic';

export default async function TechRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const qs = toSearchParams(raw).toString();
  permanentRedirect(qs ? `/?${qs}` : '/');
}
