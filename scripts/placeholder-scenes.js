/**
 * 데모 자리표시자 영상의 장면 정의.
 *
 * SCENES[name](ctx, W, H, t, opts) 하나로 모든 프레임을 그린다.
 *  - t: 0~1 재생 위치. 프레임 수와 무관하게 같은 장면이 나온다.
 *  - opts.compact: 카드 루프용. HUD 를 끄고 피사체를 키운다.
 *
 * 모든 치수는 S = H/720 을 곱해 캔버스 크기에 비례하게 만든다.
 * 절대 픽셀로 두면 카드 크기로 줄였을 때 피사체가 읽히지 않는다.
 */
const INK = '#0c1017';
const GRID = 'rgba(255,255,255,0.045)';
const AI = '#7ba3d0';
const TWIN = '#5faa9d';
const ALERT = '#d4763c';
const OK = '#5aa683';

const scaleOf = (H) => H / 720;

function bg(ctx, W, H) {
  const S = scaleOf(H);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  const step = 64 * S;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
    ctx.stroke();
  }
}

function label(ctx, text, x, y, color, size) {
  ctx.font = `500 ${Math.round(size)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** 화면 상단 상태 표시. 카드 루프에서는 카드가 자체 라벨을 얹으므로 그리지 않는다. */
function hud(ctx, W, H, left, right, opts) {
  if (opts?.compact) return;
  const S = scaleOf(H);
  label(ctx, left, 28 * S, 40 * S, 'rgba(255,255,255,0.55)', 17 * S);
  if (right) {
    ctx.font = `500 ${Math.round(17 * S)}px ui-sans-serif, system-ui, sans-serif`;
    label(ctx, right, W - 28 * S - ctx.measureText(right).width, 40 * S, 'rgba(255,255,255,0.55)', 17 * S);
  }
}

function person(ctx, x, y, h, color) {
  const w = h * 0.34;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - h + w * 0.5, w * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - w * 0.32, y - h + w * 1.1, w * 0.64, h * 0.5);
  ctx.fillRect(x - w * 0.3, y - h * 0.42, w * 0.24, h * 0.42);
  ctx.fillRect(x + w * 0.06, y - h * 0.42, w * 0.24, h * 0.42);
}

function bbox(ctx, x, y, w, h, color, text, S) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * S;
  ctx.strokeRect(x, y, w, h);
  if (!text) return;
  const fs = Math.round(16 * S);
  ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + 14 * S;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 26 * S, tw, 26 * S);
  ctx.fillStyle = INK;
  ctx.fillText(text, x + 7 * S, y - 8 * S);
}

/** 원근감을 주는 바닥 선 */
function ground(ctx, W, H) {
  const S = scaleOf(H);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = H * 0.55 + i * i * 14 * S + 20 * S;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y - 30 * S);
    ctx.stroke();
  }
}

const SCENES = {
  /** 통제선 침입 — 탐지 오버레이 포함 */
  intrusion(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    // 카드에서는 피사체를 키워야 무엇이 일어나는지 읽힌다
    const z = opts?.compact ? 1.7 : 1;
    bg(ctx, W, H);
    ground(ctx, W, H);

    const lineX = W * 0.5;
    ctx.setLineDash([16 * S, 10 * S]);
    ctx.strokeStyle = ALERT;
    ctx.lineWidth = 3 * S * z;
    ctx.beginPath();
    ctx.moveTo(lineX, H * 0.3);
    ctx.lineTo(lineX, H);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!opts?.compact) {
      label(ctx, 'RESTRICTED', lineX + 12 * S, H * 0.36, 'rgba(212,118,60,0.8)', 15 * S);
    }

    const x = W * 0.18 + t * W * 0.5;
    const y = H * 0.88;
    const h = H * 0.24 * z;
    const crossed = x > lineX;

    person(ctx, x, y, h, crossed ? 'rgba(212,118,60,0.95)' : 'rgba(255,255,255,0.8)');
    bbox(
      ctx,
      x - h * 0.24,
      y - h - h * 0.09,
      h * 0.48,
      h + h * 0.13,
      crossed ? ALERT : AI,
      crossed ? 'INTRUSION 0.96' : 'PERSON 0.94',
      S * z,
    );

    if (!opts?.compact) {
      const x2 = W * 0.85 - t * 40 * S;
      const h2 = H * 0.14;
      person(ctx, x2, H * 0.8, h2, 'rgba(255,255,255,0.32)');
      bbox(ctx, x2 - h2 * 0.24, H * 0.8 - h2 * 1.09, h2 * 0.48, h2 * 1.13, 'rgba(123,163,208,0.45)', null, S);
    }

    hud(ctx, W, H, 'CAM 03 · 서측 통제선', crossed ? '● ALERT' : '● MONITORING', opts);
    if (crossed) {
      ctx.fillStyle = 'rgba(212,118,60,0.09)';
      ctx.fillRect(0, 0, W, H);
    }
  },

  /**
   * 배회 탐지 — 승강장을 오가는 인원과 체류 시간 누적.
   *
   * 다른 자리표시자보다 공들인 이유: 카드 썸네일로 쓰인다. 격자 위 막대인간은
   * 시험 화면으로 읽혀서, 배경(승강장)·인물(관절 실루엣)·CCTV 질감(타임스탬프·
   * 노이즈·비네트)을 갖춘 장면으로 그린다.
   */
  loitering(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.45 : 1;
    const rand = (i) => {
      const v = Math.sin(i * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };

    // ── 배경: 야간 승강장 ────────────────────────────────────────────
    ctx.fillStyle = '#101318';
    ctx.fillRect(0, 0, W, H);

    // 벽 패널
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, W, H * 0.52);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = (W / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.08);
      ctx.lineTo(x, H * 0.52);
      ctx.stroke();
    }
    // 벽 상단 안내띠
    ctx.fillStyle = 'rgba(95,122,160,0.16)';
    ctx.fillRect(0, H * 0.1, W, H * 0.05);

    // 천장 조명 얼룩
    for (let i = 0; i < 4; i++) {
      const lx = W * (0.14 + i * 0.24);
      const g = ctx.createRadialGradient(lx, H * 0.06, 0, lx, H * 0.06, H * 0.42);
      g.addColorStop(0, 'rgba(210,220,235,0.10)');
      g.addColorStop(1, 'rgba(210,220,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - H * 0.42, 0, H * 0.84, H * 0.6);
    }

    // 바닥 타일 (원근)
    ctx.fillStyle = '#14181f';
    ctx.fillRect(0, H * 0.52, W, H * 0.48);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 7; i++) {
      const y = H * 0.52 + (i * i * 6 + i * 14) * S;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + i * 60 * S, H * 0.52);
      ctx.lineTo(W * 0.5 + i * 200 * S, H);
      ctx.stroke();
    }

    // 승강장 안전선 — 노란 점자블록 띠
    ctx.fillStyle = 'rgba(196,160,66,0.5)';
    ctx.fillRect(0, H * 0.9, W, 10 * S);
    ctx.fillStyle = 'rgba(196,160,66,0.28)';
    ctx.fillRect(0, H * 0.9 + 12 * S, W, 4 * S);

    // 기둥 두 개
    for (const px of [W * 0.12, W * 0.88]) {
      ctx.fillStyle = '#1b212b';
      ctx.fillRect(px - 24 * S, H * 0.14, 48 * S, H * 0.62);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px - 24 * S, H * 0.14, 8 * S, H * 0.62);
    }

    // ── 인물: 배회 동선과 걷는 실루엣 ────────────────────────────────
    const sway = Math.sin(t * Math.PI * 5);
    const x = W * 0.5 + sway * W * 0.21;
    const y = H * 0.885;
    const h = H * 0.3 * z;
    const walkPhase = t * Math.PI * 26;
    // 방향 전환 순간에는 보폭이 줄되, 다리가 완전히 붙지는 않게 하한을 둔다
    const stride = 0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI * 5));
    const facing = Math.sign(Math.cos(t * Math.PI * 5)) || 1;

    const dwell = Math.floor(t * 52);
    const flagged = dwell >= 30;

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4 * S, h * 0.22, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    /*
      투톤 실루엣 — 상의와 하의 색을 갈라야 몸통과 다리가 분리돼 보인다.
      한 색으로 그리면 획들이 합쳐져 볼링핀이 된다.
    */
    const jacket = flagged ? 'rgba(224,150,92,0.95)' : 'rgba(196,204,216,0.88)';
    const pants = flagged ? 'rgba(176,108,62,0.95)' : 'rgba(132,142,158,0.85)';
    ctx.lineCap = 'round';

    const hipY = y - h * 0.48;
    const shoulderY = y - h * 0.8;
    const legSwing = Math.sin(walkPhase) * 0.4 * stride;
    const armSwing = Math.sin(walkPhase + Math.PI) * 0.3 * stride;

    // 다리 — 앞뒤 다리의 명도를 갈라 겹쳐도 형태가 남게 한다
    for (const dir of [1, -1]) {
      ctx.strokeStyle = dir === 1 ? pants : (flagged ? 'rgba(140,84,48,0.9)' : 'rgba(104,112,126,0.8)');
      ctx.lineWidth = h * 0.075;
      const kneeX = x + facing * Math.sin(legSwing) * h * 0.2 * dir;
      const footX = x + facing * Math.sin(legSwing) * h * 0.38 * dir;
      ctx.beginPath();
      ctx.moveTo(x, hipY);
      ctx.quadraticCurveTo(kneeX, y - h * 0.26, footX, y);
      ctx.stroke();
    }
    // 몸통 — 어깨가 엉덩이보다 넓은 사다리꼴
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.1, shoulderY);
    ctx.lineTo(x + h * 0.1, shoulderY);
    ctx.lineTo(x + h * 0.065, hipY + h * 0.02);
    ctx.lineTo(x - h * 0.065, hipY + h * 0.02);
    ctx.closePath();
    ctx.fill();
    // 팔 — 상의보다 살짝 어둡게, 손끝은 허리 근처까지만
    ctx.strokeStyle = flagged ? 'rgba(200,128,74,0.95)' : 'rgba(168,177,192,0.85)';
    ctx.lineWidth = h * 0.055;
    for (const dir of [1, -1]) {
      const handX = x + facing * Math.sin(armSwing) * h * 0.24 * dir;
      ctx.beginPath();
      ctx.moveTo(x + facing * h * 0.01, shoulderY - h * 0.03 + h * 0.05);
      ctx.quadraticCurveTo(
        x + facing * Math.sin(armSwing) * h * 0.12 * dir,
        y - h * 0.6,
        handX,
        y - h * 0.42,
      );
      ctx.stroke();
    }
    // 머리 — 목 간격을 두어 몸통과 붙지 않게
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.arc(x + facing * h * 0.03, shoulderY - h * 0.16, h * 0.088, 0, Math.PI * 2);
    ctx.fill();

    // ── 탐지 오버레이 ────────────────────────────────────────────────
    // 감시 구역
    const zx = W * 0.2;
    const zw = W * 0.6;
    const zy = H * 0.5;
    const zh = H * 0.44;
    ctx.setLineDash([12 * S, 8 * S]);
    ctx.strokeStyle = 'rgba(123,163,208,0.5)';
    ctx.lineWidth = 2 * S * z;
    ctx.strokeRect(zx, zy, zw, zh);
    ctx.setLineDash([]);
    if (!opts?.compact) {
      label(ctx, 'ZONE A · DWELL WATCH', zx + 10 * S, zy - 10 * S, 'rgba(123,163,208,0.7)', 14 * S);
    }

    // 이동 궤적 — 바닥에 남는 점
    for (let k = 2; k <= 26; k += 2) {
      const tk = Math.max(0, t - k * 0.011);
      const px = W * 0.5 + Math.sin(tk * Math.PI * 5) * W * 0.21;
      ctx.fillStyle = flagged ? `rgba(212,118,60,${0.34 - k * 0.011})` : `rgba(123,163,208,${0.3 - k * 0.01})`;
      ctx.beginPath();
      ctx.arc(px, y + 2 * S, 3.2 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    bbox(
      ctx,
      x - h * 0.26,
      y - h - h * 0.06,
      h * 0.52,
      h + h * 0.1,
      flagged ? ALERT : AI,
      flagged ? 'LOITERING 0.91' : 'PERSON 0.95',
      S * z * 0.9,
    );

    if (!opts?.compact) {
      const mm = String(Math.floor(dwell / 60)).padStart(2, '0');
      const ss = String(dwell % 60).padStart(2, '0');
      label(
        ctx,
        `DWELL ${mm}:${ss}`,
        zx + 10 * S,
        zy + zh - 12 * S,
        flagged ? 'rgba(224,150,92,0.95)' : 'rgba(255,255,255,0.65)',
        16 * S,
      );
    }

    // ── CCTV 질감 ────────────────────────────────────────────────────
    // 주사선
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let yy = 0; yy < H; yy += 4 * S) ctx.fillRect(0, yy, W, 1.4 * S);
    // 노이즈 반점 (프레임마다 결정적으로 변한다)
    const frameSeed = Math.floor(t * 150);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 90; i++) {
      const nx = rand(i * 7.13 + frameSeed) * W;
      const ny = rand(i * 3.71 + frameSeed * 1.7) * H;
      ctx.fillRect(nx, ny, 1.6 * S, 1.6 * S);
    }
    // 비네트
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (flagged) {
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }

    // HUD — 타임스탬프와 REC 로 CCTV 임을 밝힌다
    if (!opts?.compact) {
      const sec = String(10 + Math.floor(t * 52) % 50).padStart(2, '0');
      ctx.font = `500 ${Math.round(16 * S)}px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('CAM 07 · 동측 승강장', 28 * S, 40 * S);
      ctx.fillText(`2026-08-11 04:12:${sec}`, 28 * S, H - 24 * S);

      const status = flagged ? 'ALERT' : 'TRACKING';
      ctx.fillStyle = flagged ? 'rgba(212,118,60,0.95)' : 'rgba(120,190,140,0.9)';
      ctx.beginPath();
      ctx.arc(W - 28 * S - ctx.measureText(status).width - 14 * S, 34 * S, 5 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(status, W - 28 * S - ctx.measureText(status).width, 40 * S);
    }
  },

  /** 같은 구역 원본 영상 — 오버레이 없음 (모델 입력 샘플) */
  intrusionRawA(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    bg(ctx, W, H);
    ground(ctx, W, H);
    ctx.setLineDash([16 * S, 10 * S]);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.3);
    ctx.lineTo(W * 0.5, H);
    ctx.stroke();
    ctx.setLineDash([]);
    person(ctx, W * 0.18 + t * W * 0.5, H * 0.88, H * 0.24, 'rgba(255,255,255,0.75)');
    hud(ctx, W, H, 'CAM 03 · 서측 통제선', 'REC', opts);
  },

  /** 야간 담장 구간 원본 영상 */
  intrusionRawB(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    bg(ctx, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2 * S;
    for (let i = 0; i <= 25; i++) {
      const x = W * 0.05 + i * (W * 0.9) / 25;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.4);
      ctx.lineTo(x, H * 0.74);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(W * 0.05, H * 0.42);
    ctx.lineTo(W * 0.95, H * 0.42);
    ctx.stroke();
    const x = W * 0.4 + t * W * 0.14;
    const y = H * 0.9 - Math.sin(t * Math.PI) * H * 0.34;
    person(ctx, x, y, H * 0.22, 'rgba(255,255,255,0.62)');
    hud(ctx, W, H, 'CAM 07 · 북측 외곽 담장 · IR', 'REC', opts);
  },

  /** 군중 밀집도 */
  crowd(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    bg(ctx, W, H);
    for (const [cx, cy, r, a] of [
      [W * 0.36, H * 0.55, H * 0.34, 0.38],
      [W * 0.68, H * 0.62, H * 0.25, 0.28],
    ]) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(212,118,60,${a})`);
      g.addColorStop(1, 'rgba(212,118,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 420; i++) {
      const seed = i * 12.9898;
      const bx = Math.abs((Math.sin(seed) * 43758.5453) % 1);
      const by = Math.abs((Math.sin(seed * 1.7) * 43758.5453) % 1);
      const x = ((bx * 0.9 + 0.05) * W + Math.sin(t * Math.PI * 2 + i) * 8 * S) % W;
      const y = (by * 0.5 + 0.34) * H + Math.cos(t * Math.PI * 2 + i * 0.7) * 6 * S;
      ctx.beginPath();
      ctx.arc(x, y, 3 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    const count = 1180 + Math.round(Math.sin(t * Math.PI * 2) * 60);
    ctx.font = `600 ${Math.round(56 * S)}px ui-monospace, monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(String(count), 28 * S, H - 40 * S);
    label(ctx, '추정 인원', 28 * S, H - 96 * S, 'rgba(255,255,255,0.5)', 16 * S);
    hud(ctx, W, H, '광장 A · 밀집도 관측', '● LIVE', opts);
  },

  /** 플랜트 디지털 트윈 */
  twin(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.35 : 1;
    bg(ctx, W, H);

    const sway = Math.sin(t * Math.PI * 2) * 12 * S;
    ctx.save();
    ctx.translate(W * 0.5 + sway, H * 0.52);
    ctx.scale(S * z, S * z);

    ctx.strokeStyle = TWIN;
    ctx.lineWidth = 2.5 / z;
    ctx.beginPath();
    ctx.ellipse(120, -80, 90, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const px of [30, 210]) {
      ctx.beginPath();
      ctx.moveTo(px, -80);
      ctx.lineTo(px, 90);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(120, 90, 90, 34, 0, 0, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-260, 120);
    ctx.lineTo(-260, -100);
    ctx.lineTo(-140, -160);
    ctx.lineTo(-140, 60);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-260, -100);
    ctx.lineTo(-140, -160);
    ctx.lineTo(-20, -100);
    ctx.lineTo(-140, -40);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, -20);
    ctx.lineTo(30, -20);
    ctx.stroke();

    const pulse = 8 + Math.sin(t * Math.PI * 4) * 5;
    ctx.fillStyle = ALERT;
    ctx.beginPath();
    ctx.arc(-140, -160, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OK;
    for (const [sx, sy] of [[120, -80], [-260, 20], [210, 40]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    label(
      ctx,
      'TEMP  82.4 °C',
      W * 0.5 + sway - 175 * S * z,
      H * 0.52 - 185 * S * z,
      ALERT,
      17 * S * z,
    );
    hud(ctx, W, H, 'REACTOR-02 · 실시간 센서 연동', '● SYNCED', opts);
  },

  /** 도시 침수 시뮬레이션 */
  flood(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    bg(ctx, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.075)';
    for (const [x, y, w, h] of [
      [0.08, 0.18, 0.14, 0.2], [0.26, 0.14, 0.1, 0.26], [0.42, 0.2, 0.16, 0.18],
      [0.64, 0.14, 0.12, 0.26], [0.82, 0.18, 0.1, 0.22],
      [0.08, 0.56, 0.18, 0.24], [0.32, 0.58, 0.13, 0.22], [0.52, 0.56, 0.15, 0.27],
      [0.74, 0.6, 0.14, 0.2],
    ]) {
      ctx.fillRect(x * W, y * H, w * W, h * H);
    }

    const level = 0.26 + t * 0.36;
    ctx.fillStyle = 'rgba(61,107,140,0.58)';
    ctx.fillRect(0, H * (1 - level), W, H * level);
    ctx.fillStyle = 'rgba(80,137,171,0.5)';
    ctx.fillRect(0, H * (1 - level), W, 26 * S);
    ctx.fillStyle = 'rgba(47,86,111,0.6)';
    ctx.fillRect(W * 0.28, H * (1 - level * 0.72), W * 0.34, H * level * 0.72);

    if (!opts?.compact) {
      let lx = 28 * S;
      for (const [text, color] of [
        ['0.3m', 'rgba(47,86,111,0.95)'],
        ['0.8m', 'rgba(61,107,140,0.95)'],
        ['1.5m 이상', 'rgba(80,137,171,0.95)'],
      ]) {
        ctx.fillStyle = color;
        ctx.fillRect(lx, H - 46 * S, 26 * S, 12 * S);
        label(ctx, text, lx + 34 * S, H - 35 * S, 'rgba(255,255,255,0.75)', 15 * S);
        lx += ctx.measureText(text).width + 78 * S;
      }
    }
    hud(ctx, W, H, '100년 빈도 강우 · 침수심 분포', `T+ ${Math.round(t * 180)} min`, opts);
  },
};

if (typeof window !== 'undefined') window.SCENES = SCENES;
