import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { DemoUnavailableError, runDemo } from '@/lib/demo/gradio';

export const runtime = 'nodejs';
// 추론 결과는 매번 달라지고 내부 상태에 의존하므로 캐시하지 않는다.
export const dynamic = 'force-dynamic';

const SAMPLE_ROOT = path.join(process.cwd(), 'public', 'samples');
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/**
 * 샘플 파일을 읽는다.
 *
 * 두 곳에서 온다.
 *  - /api/media/... : 관리자가 화면에서 올린 파일(저장소). 배포본의 파일
 *    시스템은 읽기 전용이라 업로드한 샘플은 여기에만 있다. 우리 origin 의
 *    미디어 경로만 허용하므로 임의 주소를 대신 받아 오는 통로가 되지 않는다.
 *  - /samples/...  : 저장소에 함께 커밋한 파일.
 *
 * 어느 쪽이든 관리자가 입력한 값이므로 경로를 벗어나지 못하게 묶는다.
 */
async function readSample(samplePath: string, origin: string): Promise<File> {
  if (samplePath.startsWith('/api/media/')) {
    if (samplePath.includes('..')) {
      throw new DemoUnavailableError('허용되지 않은 샘플 경로입니다.');
    }
    try {
      const response = await fetch(new URL(samplePath, origin), { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      /*
        이름과 형식을 붙여 넘긴다. 확장자가 없으면 받는 쪽(Gradio)이 이미지인지
        영상인지 판단하지 못해 업로드 단계에서 거절하는 경우가 있다.
      */
      return new File([blob], samplePath.split('/').pop() || 'sample', {
        type: response.headers.get('content-type') ?? blob.type,
      });
    } catch {
      throw new DemoUnavailableError('샘플 파일을 불러오지 못했습니다.');
    }
  }

  const resolved = path.resolve(SAMPLE_ROOT, samplePath.replace(/^\/samples\//, ''));
  if (!resolved.startsWith(SAMPLE_ROOT + path.sep)) {
    throw new DemoUnavailableError('허용되지 않은 샘플 경로입니다.');
  }

  try {
    const buffer = await fs.readFile(resolved);
    return new File([new Uint8Array(buffer)], path.basename(resolved));
  } catch {
    throw new DemoUnavailableError('샘플 파일을 찾을 수 없습니다.');
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // 공개 조회를 쓴다 — 비공개·임시저장 기술의 데모는 외부에서 실행할 수 없다.
  const tech = await getRepo().getShareable(id);
  if (!tech || tech.demo.type !== 'api') {
    return NextResponse.json({ error: '데모를 찾을 수 없습니다.' }, { status: 404 });
  }

  const origin = new URL(request.url).origin;

  try {
    let input: unknown = null;
    // 방문자가 고른 모델의 자리(색인). 주소가 아니라 열쇠만 받는다.
    let modelKey: string | null = null;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const sample = form.get('sample');
      const model = form.get('model');
      if (typeof model === 'string') modelKey = model;

      if (file instanceof File) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: '업로드 용량이 너무 큽니다.' }, { status: 413 });
        }
        input = file;
      } else if (typeof sample === 'string') {
        input = await readSample(sample, origin);
      }
    } else if (contentType.includes('application/json')) {
      const body = (await request.json()) as { text?: string; sample?: string; model?: string };
      if (typeof body.model === 'string') modelKey = body.model;

      if (tech.demo.input_kind === 'text_input') {
        input = body.text ?? '';
      } else if (body.sample) {
        input = await readSample(body.sample, origin);
      }
    }

    if (tech.demo.input_kind === 'none') input = null;

    const result = await runDemo(tech, input, modelKey);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DemoUnavailableError) {
      // 503 은 클라이언트가 폴백 화면으로 전환하는 신호다.
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(`[demo:${id}] 예기치 못한 오류`, err);
    return NextResponse.json({ error: '데모 실행에 실패했습니다.' }, { status: 500 });
  }
}
