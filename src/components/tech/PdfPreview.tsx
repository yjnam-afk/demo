'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * PDF 첫 장 미리보기 — 브라우저가 직접 그린다.
 *
 * 내장 뷰어(<object type="application/pdf">)는 iOS 사파리가 지원하지
 * 않아 모바일에서 통째로 빈 칸이 됐다. 전시장에서 QR 로 여는 화면이
 * 폰이므로, 뷰어에 기대지 않고 pdf.js 로 첫 장을 캔버스에 그린다 —
 * 어느 브라우저든 같은 결과가 나온다.
 *
 * pdf.js 는 이 컴포넌트가 화면에 설 때에야 내려받는다(동적 import).
 * 워커 파일은 판번호가 라이브러리와 어긋나면 조용히 죽으므로, 설치본을
 * public/pdf.worker.min.mjs 로 복사해 두고 그 경로를 쓴다.
 */
export function PdfPreview({ url, label }: { url: string; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        /*
          파일을 먼저 직접 받는다. pdf.js 에 URL 을 그대로 주면 "왜"
          실패했는지(파일이 없음 vs 렌더링 실패)를 구분할 수 없어,
          관리자에게 다음 행동을 말해줄 수 없다.
        */
        // 캐시를 거치지 않는다 — 방금 다시 올린 파일이 캐시된 실패에 가려지면 안 된다
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          if (!cancelled) {
            setHttpStatus(response.status);
            setState('error');
          }
          return;
        }
        const data = new Uint8Array(await response.arrayBuffer());

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const doc = await pdfjs.getDocument({ data }).promise;
        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap || cancelled) return;

        // 컨테이너 폭 기준으로 선명하게(기기 배율 반영) 그린다
        const base = page.getViewport({ scale: 1 });
        const scale = (wrap.clientWidth * (window.devicePixelRatio || 1)) / base.width;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas 2d context 없음');
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setState('ok');
      } catch (err) {
        console.error('[pdf-preview]', url, err);
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center bg-ink-50">
      {state === 'error' ? (
        <p className="p-6 text-center text-sm text-ink-400">
          {httpStatus
            ? /*
                파일명을 함께 보여준다. 업로드 파일명에는 올린 시각이 들어
                있어, 기록이 방금 올린 파일을 가리키는지 옛 경로에 머물러
                있는지를 이 문구만 보고 판별할 수 있다.
              */
              `원본 파일을 불러오지 못했습니다 (HTTP ${httpStatus} · ${url.split('/').pop() ?? url}). 관리자에서 이 자료를 다시 올려 주세요.`
            : '미리보기를 만들지 못했습니다. 아래에서 원문을 여세요.'}
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          aria-label={label}
          className={state === 'ok' ? 'max-h-full w-auto max-w-full' : 'hidden'}
        />
      )}
      {state === 'loading' ? <p className="text-sm text-ink-400">미리보기 준비 중…</p> : null}
    </div>
  );
}
