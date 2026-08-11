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

  /** 배회 탐지 — 감시 구역 안을 오가는 인원과 체류 시간 누적 */
  loitering(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.7 : 1;
    bg(ctx, W, H);
    ground(ctx, W, H);

    // 감시 구역 — 체류 시간을 재는 범위를 화면에 밝힌다
    const zx = W * 0.22;
    const zw = W * 0.56;
    const zy = H * 0.42;
    const zh = H * 0.5;
    ctx.setLineDash([14 * S, 9 * S]);
    ctx.strokeStyle = 'rgba(123,163,208,0.55)';
    ctx.lineWidth = 2.5 * S * z;
    ctx.strokeRect(zx, zy, zw, zh);
    ctx.setLineDash([]);
    if (!opts?.compact) {
      label(ctx, 'ZONE A · DWELL WATCH', zx + 10 * S, zy - 10 * S, 'rgba(123,163,208,0.75)', 15 * S);
    }

    // 두 번 반 오간다 — 배회는 방향 전환이 정체성이다
    const sway = Math.sin(t * Math.PI * 5);
    const x = W * 0.5 + sway * zw * 0.36;
    const y = H * 0.86 + Math.cos(t * Math.PI * 10) * 6 * S;
    const h = H * 0.24 * z;

    // 체류 시간 누적 — 문턱을 넘으면 배회 판정
    const dwell = Math.floor(t * 52);
    const flagged = dwell >= 30;

    person(ctx, x, y, h, flagged ? 'rgba(212,118,60,0.95)' : 'rgba(255,255,255,0.8)');
    bbox(
      ctx,
      x - h * 0.24,
      y - h - h * 0.09,
      h * 0.48,
      h + h * 0.13,
      flagged ? ALERT : AI,
      flagged ? 'LOITERING 0.91' : 'PERSON 0.95',
      S * z,
    );

    // 이동 궤적 — 같은 자리를 오갔음을 남긴다
    ctx.strokeStyle = flagged ? 'rgba(212,118,60,0.35)' : 'rgba(123,163,208,0.3)';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const tk = Math.max(0, t - k * 0.012);
      const px = W * 0.5 + Math.sin(tk * Math.PI * 5) * zw * 0.36;
      const py = H * 0.86 + Math.cos(tk * Math.PI * 10) * 6 * S - 4 * S;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (!opts?.compact) {
      const mm = String(Math.floor(dwell / 60)).padStart(2, '0');
      const ss = String(dwell % 60).padStart(2, '0');
      label(
        ctx,
        `DWELL ${mm}:${ss}`,
        zx + 10 * S,
        zy + zh - 14 * S,
        flagged ? 'rgba(212,118,60,0.9)' : 'rgba(255,255,255,0.6)',
        16 * S,
      );
    }

    hud(ctx, W, H, 'CAM 07 · 동측 승강장', flagged ? '● ALERT' : '● TRACKING', opts);
    if (flagged) {
      ctx.fillStyle = 'rgba(212,118,60,0.09)';
      ctx.fillRect(0, 0, W, H);
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
