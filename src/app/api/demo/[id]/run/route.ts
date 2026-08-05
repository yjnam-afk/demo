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

/** 샘플 경로는 관리자가 입력한 값이므로 public/samples 밖으로 나가지 못하게 묶는다. */
async function readSample(samplePath: string): Promise<Blob> {
  const resolved = path.resolve(SAMPLE_ROOT, samplePath.replace(/^\/samples\//, ''));
  if (!resolved.startsWith(SAMPLE_ROOT + path.sep)) {
    throw new DemoUnavailableError('허용되지 않은 샘플 경로입니다.');
  }

  try {
    const buffer = await fs.readFile(resolved);
    return new Blob([new Uint8Array(buffer)]);
  } catch {
    throw new DemoUnavailableError('샘플 파일을 찾을 수 없습니다.');
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // 공개 조회를 쓴다 — 비공개·임시저장 기술의 데모는 외부에서 실행할 수 없다.
  const tech = await getRepo().getPublic(id);
  if (!tech || tech.demo.type !== 'api') {
    return NextResponse.json({ error: '데모를 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    let input: unknown = null;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const sample = form.get('sample');

      if (file instanceof File) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: '업로드 용량이 너무 큽니다.' }, { status: 413 });
        }
        input = file;
      } else if (typeof sample === 'string') {
        input = await readSample(sample);
      }
    } else if (contentType.includes('application/json')) {
      const body = (await request.json()) as { text?: string; sample?: string };

      if (tech.demo.input_kind === 'text_input') {
        input = body.text ?? '';
      } else if (body.sample) {
        input = await readSample(body.sample);
      }
    }

    if (tech.demo.input_kind === 'none') input = null;

    const result = await runDemo(tech, input);
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
