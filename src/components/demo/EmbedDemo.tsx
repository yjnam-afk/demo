'use client';

import { useCallback, useEffect, useState } from 'react';
import { DemoFallback, type FallbackContent } from './DemoFallback';

const PROBE_TIMEOUT_MS = 12_000;

type State = 'probing' | 'ready' | 'failed';

/**
 * embed 타입 데모.
 *
 * iframe 은 /api/embed/{id}/ 만 가리킨다. 실제 웹앱 주소는 서버의 프록시가 알고 있고
 * 크롬 제거 파라미터도 프록시가 붙인다.
 *
 * iframe 을 바로 붙이지 않고 헬스체크를 먼저 부른다. iframe 의 onLoad 는 프록시가
 * 돌려준 502 오류 문서에도 똑같이 발생하므로, onLoad 만 믿으면 데모 서버가 죽었을 때
 * 오류 문구만 담긴 빈 상자가 그대로 방문자에게 남는다.
 */
export function EmbedDemo({
  techId,
  title,
  fallback,
}: {
  techId: string;
  title: string;
  fallback: FallbackContent;
}) {
  const [state, setState] = useState<State>('probing');
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const probe = useCallback(async () => {
    setState('probing');
    setLoaded(false);

    try {
      const response = await fetch(`/api/demo/${techId}/health`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        cache: 'no-store',
      });
      const body = (await response.json()) as { status?: string };
      setState(response.ok && body.status === 'ok' ? 'ready' : 'failed');
    } catch {
      setState('failed');
    }
  }, [techId]);

  useEffect(() => {
    void probe();
  }, [probe, attempt]);

  if (state === 'failed') {
    return (
      <DemoFallback
        message="데모 화면을 불러오지 못했습니다."
        content={fallback}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  if (state === 'probing') {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-ink-200 bg-ink-50 text-sm text-ink-500">
        데모 화면을 준비하는 중입니다…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-950">
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-50 text-sm text-ink-500">
          데모 화면을 불러오는 중입니다…
        </div>
      ) : null}
      <iframe
        key={attempt}
        src={`/api/embed/${techId}/`}
        title={title}
        className="aspect-video w-full"
        // 프록시 경유라 동일 출처지만, 임베드된 앱에 필요 이상의 권한을 주지 않는다.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
