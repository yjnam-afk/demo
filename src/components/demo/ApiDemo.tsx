'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DemoFallback, type FallbackContent } from './DemoFallback';
import { INPUT_KIND_LABELS, type InputKind } from '@/lib/domain/enums';
import type { DemoSample } from '@/lib/domain/types';

type Output =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'text'; value: string }
  | { kind: 'json'; value: string };

type State =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'done'; outputs: Output[]; elapsed: number }
  | { phase: 'failed'; message: string };

function OutputView({ output }: { output: Output }) {
  switch (output.kind) {
    case 'image':
      // 결과는 프록시 경유 URL 이며 매 실행마다 바뀐다.
      // eslint-disable-next-line @next/next/no-img-element
      return <img className="w-full rounded border border-ink-200" src={output.url} alt="추론 결과" />;
    case 'video':
      return (
        <video className="w-full rounded bg-ink-900" src={output.url} controls playsInline autoPlay muted loop />
      );
    case 'text':
      return <p className="text-sm whitespace-pre-wrap text-ink-800">{output.value}</p>;
    case 'json':
      return (
        <pre className="numeric overflow-x-auto rounded bg-ink-900 p-3 text-xs text-ink-100">
          {output.value}
        </pre>
      );
  }
}

/**
 * api 타입 데모 화면.
 *
 * Gradio 기본 UI 는 노출하지 않는다. 입력·실행·결과 표현은 전부 우리 컴포넌트이며
 * 호출은 /api/demo/{id}/run 프록시를 거친다. 내부망 주소는 이 파일에 존재하지 않는다.
 *
 * 첫 화면은 "샘플로 실행해보기"가 눌린 상태다. 방문자에게 파일 업로드를 먼저
 * 요구하면 이탈하므로 업로드는 부가 옵션으로 둔다.
 */
export function ApiDemo({
  techId,
  inputKind,
  samples,
  fallback,
}: {
  techId: string;
  inputKind: InputKind;
  samples: DemoSample[];
  fallback: FallbackContent;
}) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState(samples[0]?.text ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const autoRunDone = useRef(false);

  const run = useCallback(
    async (payload: { sample?: DemoSample; file?: File; text?: string }) => {
      setState({ phase: 'running' });

      try {
        let response: Response;

        if (payload.file) {
          const form = new FormData();
          form.append('file', payload.file);
          response = await fetch(`/api/demo/${techId}/run`, { method: 'POST', body: form });
        } else {
          response = await fetch(`/api/demo/${techId}/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sample: payload.sample?.path,
              text: payload.text ?? payload.sample?.text,
            }),
          });
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setState({ phase: 'failed', message: body.error ?? '데모를 실행하지 못했습니다.' });
          return;
        }

        const result = (await response.json()) as { outputs: Output[]; elapsed_ms: number };
        setState({ phase: 'done', outputs: result.outputs, elapsed: result.elapsed_ms });
      } catch {
        setState({ phase: 'failed', message: '데모 서버에 연결하지 못했습니다.' });
      }
    },
    [techId],
  );

  // 진입 시 첫 샘플로 한 번 실행해 방문자가 아무것도 하지 않아도 결과를 본다.
  useEffect(() => {
    if (autoRunDone.current) return;
    autoRunDone.current = true;

    if (inputKind === 'none') void run({});
    else if (samples.length > 0) void run({ sample: samples[0], text: samples[0].text });
  }, [inputKind, run, samples]);

  if (state.phase === 'failed') {
    return (
      <DemoFallback
        message={state.message}
        content={fallback}
        onRetry={() => {
          const sample = samples[selected];
          if (inputKind === 'none') void run({});
          else if (sample) void run({ sample, text: sample.text });
        }}
      />
    );
  }

  const uploadLabel = inputKind === 'video_upload' ? '영상' : '이미지';
  const showUpload = inputKind === 'video_upload' || inputKind === 'image_upload';

  return (
    <div className="rounded-lg border border-ink-200 bg-white">
      <div className="border-b border-ink-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-700">샘플로 실행해보기</span>
          <span className="text-xs text-ink-400">{INPUT_KIND_LABELS[inputKind]}</span>
        </div>

        {samples.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {samples.map((sample, index) => (
              <button
                key={sample.label}
                type="button"
                disabled={state.phase === 'running'}
                onClick={() => {
                  setSelected(index);
                  if (sample.text !== undefined) setText(sample.text);
                  void run({ sample, text: sample.text });
                }}
                className={
                  index === selected
                    ? 'rounded border border-ink-700 bg-ink-700 px-3 py-1.5 text-sm text-white disabled:opacity-60'
                    : 'rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 hover:border-ink-500 disabled:opacity-60'
                }
              >
                {sample.label}
              </button>
            ))}
          </div>
        ) : null}

        {inputKind === 'text_input' ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              className="flex-1 rounded border border-ink-300 px-3 py-2 text-sm focus:border-ink-600 focus:outline-none"
              placeholder="직접 입력해 실행할 수도 있습니다."
            />
            <button
              type="button"
              disabled={state.phase === 'running'}
              onClick={() => void run({ text })}
              className="h-fit rounded bg-ink-800 px-4 py-2 text-sm text-white hover:bg-ink-900 disabled:opacity-60"
            >
              실행
            </button>
          </div>
        ) : null}

        {showUpload ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <span>직접 확인하시려면</span>
            <input
              ref={fileRef}
              type="file"
              accept={inputKind === 'video_upload' ? 'video/*' : 'image/*'}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void run({ file });
              }}
            />
            <button
              type="button"
              disabled={state.phase === 'running'}
              onClick={() => fileRef.current?.click()}
              className="rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-700 hover:border-ink-500 disabled:opacity-60"
            >
              {uploadLabel} 업로드
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        {state.phase === 'running' ? (
          <div className="flex h-48 items-center justify-center rounded bg-ink-50 text-sm text-ink-500">
            추론 중입니다…
          </div>
        ) : state.phase === 'done' ? (
          <div className="flex flex-col gap-3">
            {state.outputs.length === 0 ? (
              <p className="text-sm text-ink-500">결과가 비어 있습니다.</p>
            ) : (
              state.outputs.map((output, index) => <OutputView key={index} output={output} />)
            )}
            <p className="numeric text-xs text-ink-400">처리 시간 {state.elapsed} ms</p>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded bg-ink-50 text-sm text-ink-500">
            샘플을 선택하면 결과가 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
