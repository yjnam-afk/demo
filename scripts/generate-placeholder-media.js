/**
 * 자리표시자 데모 영상 생성기.
 *
 *   npm i --no-save playwright ffmpeg-static
 *   node scripts/generate-placeholder-media.js
 *
 * Chromium 캔버스로 장면을 그려 mp4(H.264)와 webm(VP9)을 함께 만든다.
 * 실제 촬영·녹화 영상이 준비되면 이 스크립트를 돌릴 필요 없이 public/videos 의
 * 같은 이름 파일을 덮어쓰면 된다. 그때 data/technologies.json 의 media 경로는
 * 그대로 두어도 동작한다.
 *
 * mp4 를 먼저 만들고 webm 을 함께 두는 이유는 브라우저 호환 때문이다.
 * H.264 는 거의 모든 실사용 브라우저가 재생하지만, 코덱이 빠진 Chromium 빌드
 * (CI·헤드리스 환경 등)에서는 재생되지 않아 대체 소스가 필요하다.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, '.media-frames');
const SCENES_JS = fs.readFileSync(path.join(__dirname, 'placeholder-scenes.js'), 'utf8');

const FPS = 25;
const SECONDS = 6;

/** 상세 화면용 원본 */
const FULL = { w: 1280, h: 720, compact: false, crf: '24', vp9: '900k' };
/** 카드 루프용 — HUD 없이 피사체를 키운 축소본 */
const LOOP = { w: 640, h: 400, compact: true, crf: '30', vp9: '350k' };

const JOBS = [
  { scene: 'loitering', out: 'public/videos/loitering.mp4', loop: true, poster: true },
  { scene: 'intrusion', out: 'public/videos/intrusion-detection.mp4', loop: true, poster: true },
  { scene: 'zoneReentry', out: 'public/videos/zone-reentry.mp4', loop: true, poster: true },
  { scene: 'twin', out: 'public/videos/digital-twin-plant.mp4', loop: true, poster: true },
  { scene: 'flood', out: 'public/videos/flood-simulation.mp4', loop: true, poster: true },
  // api 데모의 모델 입력 샘플 — 탐지 오버레이가 없는 원본 영상이어야 한다
  { scene: 'intrusionRawA', out: 'public/samples/intrusion_01.mp4' },
  { scene: 'intrusionRawB', out: 'public/samples/intrusion_02.mp4' },
];

async function renderFrames(page, scene, variant, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  await page.evaluate(
    ([w, h]) => {
      const c = document.getElementById('c');
      c.width = w;
      c.height = h;
    },
    [variant.w, variant.h],
  );

  const total = FPS * SECONDS;
  for (let i = 0; i < total; i++) {
    const data = await page.evaluate(
      ([s, t, compact]) => {
        const c = document.getElementById('c');
        const ctx = c.getContext('2d');
        window.SCENES[s](ctx, c.width, c.height, t, { compact });
        return c.toDataURL('image/png').slice('data:image/png;base64,'.length);
      },
      [scene, i / total, variant.compact],
    );
    fs.writeFileSync(
      path.join(dir, `${String(i).padStart(4, '0')}.png`),
      Buffer.from(data, 'base64'),
    );
  }
  return total;
}

function encode(dir, out, variant) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const input = ['-framerate', String(FPS), '-i', path.join(dir, '%04d.png')];

  // faststart 로 moov 를 앞으로 보내 첫 프레임이 빨리 뜨게 한다
  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', ...input,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', variant.crf,
    '-movflags', '+faststart', '-an', out,
  ]);

  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error', ...input,
    '-c:v', 'libvpx-vp9', '-b:v', variant.vp9, '-row-mt', '1', '-an',
    out.replace(/\.mp4$/, '.webm'),
  ]);
}

async function main() {
  // 인자로 장면 이름을 주면 그 작업만 만든다. 없으면 전부.
  const only = process.argv.slice(2);
  const jobs = only.length > 0 ? JOBS.filter((job) => only.includes(job.scene)) : JOBS;

  const browser = await chromium.launch({
    // 설치된 playwright 버전과 브라우저 번들이 어긋난 환경에서는 미리 깔린
    // 크로미움 경로를 환경 변수로 받는다.
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0"><canvas id="c"></canvas></body>');
  await page.addScriptTag({ content: SCENES_JS });

  for (const job of jobs) {
    const out = path.join(ROOT, job.out);

    const fullDir = path.join(TMP, `${job.scene}-full`);
    const total = await renderFrames(page, job.scene, FULL, fullDir);
    encode(fullDir, out, FULL);

    if (job.poster) {
      // 영상 로드 전과 폴백 화면에서 쓰는 정지 이미지
      execFileSync(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-i', path.join(fullDir, `${String(Math.floor(total * 0.72)).padStart(4, '0')}.png`),
        '-q:v', '4',
        path.join(ROOT, 'public/thumbnails', path.basename(out).replace(/\.mp4$/, '.jpg')),
      ]);
    }

    if (job.loop) {
      const loopDir = path.join(TMP, `${job.scene}-loop`);
      const loopTotal = await renderFrames(page, job.scene, LOOP, loopDir);
      encode(loopDir, out.replace(/\.mp4$/, '.loop.mp4'), LOOP);

      if (job.poster) {
        // 카드가 영상 로드 전에 쓰는 루프 포스터
        execFileSync(ffmpeg, [
          '-y', '-loglevel', 'error',
          '-i', path.join(loopDir, `${String(Math.floor(loopTotal * 0.72)).padStart(4, '0')}.png`),
          '-q:v', '4',
          path.join(ROOT, 'public/thumbnails', path.basename(out).replace(/\.mp4$/, '.loop.jpg')),
        ]);
      }
    }

    console.log('rendered', job.out);
  }

  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
}

main();
