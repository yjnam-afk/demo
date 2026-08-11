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

/**
 * 사람이 나오는 장면의 표준 키 (화면 높이 비율).
 * 장면마다 값이 다르면 카드가 나란히 설 때 인물 크기가 어긋난다.
 */
const WALKER_H = 0.28;

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

/**
 * 걷는 사람 실루엣 — 투톤(상의/하의 분리)에 관절이 있다.
 * 한 색 획으로 그리면 서로 합쳐져 볼링핀이 되므로 장면들이 공용으로 쓴다.
 *  tone: 'alert' | 'normal' | 'dim'
 */
function walker(ctx, { x, y, h, phase, stride, facing, tone }) {
  const palettes = {
    alert: { jacket: 'rgba(224,150,92,0.95)', pants: 'rgba(176,108,62,0.95)', back: 'rgba(140,84,48,0.9)', arm: 'rgba(200,128,74,0.95)' },
    normal: { jacket: 'rgba(196,204,216,0.88)', pants: 'rgba(132,142,158,0.85)', back: 'rgba(104,112,126,0.8)', arm: 'rgba(168,177,192,0.85)' },
    dim: { jacket: 'rgba(150,158,172,0.4)', pants: 'rgba(110,118,132,0.38)', back: 'rgba(92,100,114,0.35)', arm: 'rgba(130,138,152,0.38)' },
  };
  const c = palettes[tone] ?? palettes.normal;

  ctx.save();
  ctx.lineCap = 'round';

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.015, h * 0.22, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const hipY = y - h * 0.48;
  const shoulderY = y - h * 0.8;
  const legSwing = Math.sin(phase) * 0.4 * stride;
  const armSwing = Math.sin(phase + Math.PI) * 0.3 * stride;

  for (const dir of [1, -1]) {
    ctx.strokeStyle = dir === 1 ? c.pants : c.back;
    ctx.lineWidth = h * 0.075;
    const kneeX = x + facing * Math.sin(legSwing) * h * 0.2 * dir;
    const footX = x + facing * Math.sin(legSwing) * h * 0.38 * dir;
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.quadraticCurveTo(kneeX, y - h * 0.26, footX, y);
    ctx.stroke();
  }
  ctx.fillStyle = c.jacket;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.1, shoulderY);
  ctx.lineTo(x + h * 0.1, shoulderY);
  ctx.lineTo(x + h * 0.065, hipY + h * 0.02);
  ctx.lineTo(x - h * 0.065, hipY + h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.arm;
  ctx.lineWidth = h * 0.055;
  for (const dir of [1, -1]) {
    const handX = x + facing * Math.sin(armSwing) * h * 0.24 * dir;
    ctx.beginPath();
    ctx.moveTo(x + facing * h * 0.01, shoulderY + h * 0.02);
    ctx.quadraticCurveTo(
      x + facing * Math.sin(armSwing) * h * 0.12 * dir,
      y - h * 0.6,
      handX,
      y - h * 0.42,
    );
    ctx.stroke();
  }
  ctx.fillStyle = c.jacket;
  ctx.beginPath();
  ctx.arc(x + facing * h * 0.03, shoulderY - h * 0.16, h * 0.088, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** CCTV 질감 — 주사선·노이즈·비네트. 장면 마지막에 얹는다. */
function cctvTexture(ctx, W, H, t) {
  const S = scaleOf(H);
  const rand = (i) => {
    const v = Math.sin(i * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let yy = 0; yy < H; yy += 4 * S) ctx.fillRect(0, yy, W, 1.4 * S);
  const frameSeed = Math.floor(t * 150);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(rand(i * 7.13 + frameSeed) * W, rand(i * 3.71 + frameSeed * 1.7) * H, 1.6 * S, 1.6 * S);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/** CCTV 상단·하단 문자 — 카메라 이름, 시각, 상태 점. */
function cctvChrome(ctx, W, H, t, cam, flagged, statusOn, statusOff) {
  const S = scaleOf(H);
  const sec = String(10 + Math.floor(t * 52) % 50).padStart(2, '0');
  ctx.font = `500 ${Math.round(16 * S)}px ui-monospace, monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(cam, 28 * S, 40 * S);
  ctx.fillText(`2026-08-11 04:12:${sec}`, 28 * S, H - 24 * S);

  const status = flagged ? statusOn : statusOff;
  ctx.fillStyle = flagged ? 'rgba(212,118,60,0.95)' : 'rgba(120,190,140,0.9)';
  ctx.beginPath();
  ctx.arc(W - 28 * S - ctx.measureText(status).width - 14 * S, 34 * S, 5 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(status, W - 28 * S - ctx.measureText(status).width, 40 * S);
}

const SCENES = {
  /**
   * 통제선 침입 — 야간 외곽 경계.
   * 배회 장면과 같은 시각 언어(배경·투톤 인물·CCTV 질감)를 쓴다.
   */
  intrusion(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.45 : 1;

    // ── 배경: 야간 야외 경계 구역 ──────────────────────────────────
    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, W, H);
    // 밤하늘과 지평선
    ctx.fillStyle = '#12161d';
    ctx.fillRect(0, 0, W, H * 0.46);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, H * 0.455, W, 2 * S);
    // 먼 시설 실루엣
    ctx.fillStyle = '#151a22';
    for (const [bx, bw, bh] of [[0.04, 0.14, 0.1], [0.2, 0.08, 0.07], [0.74, 0.18, 0.12]]) {
      ctx.fillRect(W * bx, H * (0.46 - bh), W * bw, H * bh);
    }
    // 투광등 원뿔
    for (const lx of [0.3, 0.82]) {
      const g = ctx.createRadialGradient(W * lx, H * 0.1, 0, W * lx, H * 0.1, H * 0.55);
      g.addColorStop(0, 'rgba(215,225,240,0.09)');
      g.addColorStop(1, 'rgba(215,225,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(W * lx - H * 0.55, 0, H * 1.1, H * 0.75);
    }
    // 지면 — 아스팔트 질감의 가로선
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = H * 0.5 + i * i * 9 * S + 16 * S;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y - 18 * S);
      ctx.stroke();
    }

    // ── 통제선: 기둥 사이에 걸린 경고 테이프 ──────────────────────
    /*
      점선 하나로는 통제선이 "그래프의 보조선" 으로 읽혔다. 기둥을 세우고
      그 사이에 경고 테이프(주황·흰 사선)를 두 줄 걸어, 넘으면 안 되는
      물리적 경계라는 것이 장면만 보고도 읽히게 한다.
    */
    const lineX = W * 0.5;
    const fencePosts = [
      { y: H * 0.52, h: H * 0.062 },
      { y: H * 0.68, h: H * 0.082 },
      { y: H * 0.86, h: H * 0.104 },
      { y: H * 1.02, h: H * 0.124 },
    ];
    // 바닥의 통제선 표시 — 테이프 아래 이어지는 점선
    ctx.setLineDash([16 * S, 10 * S]);
    ctx.strokeStyle = 'rgba(212,118,60,0.75)';
    ctx.lineWidth = 3.5 * S * z;
    ctx.beginPath();
    ctx.moveTo(lineX, H * 0.47);
    ctx.lineTo(lineX, H);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of fencePosts) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(lineX, p.y, 9 * S, 3 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#39424f';
      ctx.fillRect(lineX - 3 * S, p.y - p.h, 6 * S, p.h);
      ctx.fillStyle = '#4a5566';
      ctx.beginPath();
      ctx.arc(lineX, p.y - p.h, 4 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    // 기둥 사이 경고 테이프 두 줄 — 통제선의 몸통
    for (let i = 1; i < fencePosts.length; i++) {
      const a = fencePosts[i - 1];
      const b = fencePosts[i];
      for (const lvl of [0.92, 0.55]) {
        const ay = a.y - a.h * lvl;
        const by = b.y - b.h * lvl;
        ctx.strokeStyle = 'rgba(212,118,60,0.85)';
        ctx.lineWidth = 5 * S;
        ctx.beginPath();
        ctx.moveTo(lineX, ay);
        ctx.lineTo(lineX, by);
        ctx.stroke();
        // 테이프의 흰 사선 무늬
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.6 * S;
        const seg = Math.abs(by - ay);
        for (let d = 4 * S; d < seg; d += 9 * S) {
          const yy = Math.min(ay, by) + d;
          ctx.beginPath();
          ctx.moveTo(lineX - 2.5 * S, yy + 3 * S);
          ctx.lineTo(lineX + 2.5 * S, yy - 3 * S);
          ctx.stroke();
        }
      }
    }
    if (!opts?.compact) {
      // 경고 표지판
      ctx.fillStyle = 'rgba(212,118,60,0.16)';
      ctx.fillRect(lineX + 10 * S, H * 0.36, 128 * S, 26 * S);
      label(ctx, 'RESTRICTED', lineX + 20 * S, H * 0.36 + 18 * S, 'rgba(224,150,92,0.9)', 14 * S);
    }

    // ── 인물: 걸어와 통제선 앞에서 멈칫하고, 테이프 사이로 넘어간다 ──
    const baseY = H * 0.9;
    const h = H * WALKER_H * z;

    /*
      동선을 구간으로 나눈다. 넘는 동작은 도약이 아니라 "테이프 사이를
      비집고 지나가는" 통과다 — 통제선이 뚜렷하니 선을 지나는 것만으로
      침입이 읽히고, 넘는 순간 경보가 붙는 것이 탐지의 핵심이다.
        0    ~0.42  접근 보행
        0.42 ~0.52  선 앞에서 멈칫 (두리번)
        0.52 ~0.68  통과 — 상체를 숙이고 테이프 사이를 지난다
        0.68 ~1     반대편 보행 (경보)
    */
    const approachEnd = lineX - W * 0.05;
    const landX = lineX + W * 0.05;
    function posAt(tt) {
      if (tt < 0.42) {
        const k = tt / 0.42;
        return { x: W * 0.16 + k * (approachEnd - W * 0.16), mode: 'walk' };
      }
      if (tt < 0.52) return { x: approachEnd, mode: 'pause' };
      if (tt < 0.68) {
        const k = (tt - 0.52) / 0.16;
        return { x: approachEnd + k * (landX - approachEnd), mode: 'cross' };
      }
      const k = (tt - 0.68) / 0.32;
      return { x: landX + k * (W * 0.78 - landX), mode: 'walk' };
    }

    const pos = posAt(t);
    const crossed = pos.x > lineX;

    // 넘는 순간 — 통제선이 반응한다. 탐지가 선을 물고 있다는 표시.
    if (t >= 0.52 && t < 0.72) {
      const p = Math.min(1, (t - 0.52) / 0.14);
      ctx.strokeStyle = `rgba(224,150,92,${0.5 * (1 - Math.abs(p - 0.5) * 1.2)})`;
      ctx.lineWidth = 10 * S * z;
      ctx.beginPath();
      ctx.moveTo(lineX, H * 0.47);
      ctx.lineTo(lineX, H);
      ctx.stroke();
    }

    // 이동 궤적
    for (let k = 3; k <= 24; k += 3) {
      const pk = posAt(Math.max(0, t - k * 0.012));
      ctx.fillStyle = crossed ? `rgba(212,118,60,${0.3 - k * 0.01})` : `rgba(123,163,208,${0.26 - k * 0.009})`;
      ctx.beginPath();
      ctx.arc(pk.x, baseY + 2 * S, 3 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    // 통과 중에는 상체를 숙인다 — 테이프 밑을 지나는 몸짓
    const lean = pos.mode === 'cross' ? 0.22 : 0;
    if (lean) {
      ctx.save();
      ctx.translate(pos.x, baseY - h * 0.4);
      ctx.rotate(lean);
      ctx.translate(-pos.x, -(baseY - h * 0.4));
    }
    walker(ctx, {
      x: pos.x,
      y: baseY,
      h: pos.mode === 'cross' ? h * 0.92 : h,
      // 멈칫: 다리를 모은다. 통과·보행: 걷는다.
      phase: pos.mode === 'pause' ? 0 : t * Math.PI * 26,
      stride: pos.mode === 'walk' ? 1 : pos.mode === 'cross' ? 0.6 : 0.15,
      facing: 1,
      tone: crossed ? 'alert' : 'normal',
    });
    if (lean) ctx.restore();

    // 배경의 정상 인원 — 대비를 위해 흐리게
    if (!opts?.compact) {
      walker(ctx, {
        x: W * 0.86 - t * 30 * S,
        y: H * 0.66,
        h: H * 0.12,
        phase: t * Math.PI * 18,
        stride: 0.7,
        facing: -1,
        tone: 'dim',
      });
    }

    bbox(
      ctx,
      pos.x - h * 0.26,
      baseY - h - h * 0.06,
      h * 0.52,
      h + h * 0.1,
      crossed ? ALERT : AI,
      crossed ? 'INTRUSION 0.96' : 'PERSON 0.94',
      S * z * 0.9,
    );

    if (crossed) {
      ctx.fillStyle = 'rgba(212,118,60,0.07)';
      ctx.fillRect(0, 0, W, H);
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 03 · 서측 통제선', crossed, 'ALERT', 'MONITORING');
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
    // 왕복 횟수를 줄여 서성임을 초조한 왕복이 아니라 느린 배회로 만든다
    const sway = Math.sin(t * Math.PI * 3);
    const x = W * 0.5 + sway * W * 0.21;
    const y = H * 0.885;
    const h = H * WALKER_H * z;
    const walkPhase = t * Math.PI * 16;
    // 방향 전환 순간에는 보폭이 줄되, 다리가 완전히 붙지는 않게 하한을 둔다
    const stride = 0.45 + 0.55 * Math.abs(Math.cos(t * Math.PI * 3));
    const facing = Math.sign(Math.cos(t * Math.PI * 3)) || 1;

    const dwell = Math.floor(t * 52);
    const flagged = dwell >= 30;

    walker(ctx, {
      x,
      y,
      h,
      phase: walkPhase,
      stride,
      facing,
      tone: flagged ? 'alert' : 'normal',
    });

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
      const px = W * 0.5 + Math.sin(tk * Math.PI * 3) * W * 0.21;
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

    if (flagged) {
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 07 · 동측 승강장', flagged, 'ALERT', 'TRACKING');
    }
  },

  /**
   * 경호 구역 반복 이탈·재입장 — Re-ID(재식별) 기술.
   *
   * 이 기술의 핵심은 "사라졌던 인물이 다시 나타났을 때 같은 사람임을
   * 알아본다" 이다. 그래서 인물은 구역 안 가림막 뒤로 완전히 사라졌다가
   * 다시 나타나고, 나타나는 순간 매치 링과 함께 고정 ID(047)가 다시
   * 붙는다 — 두 번째 등장부터는 RE-ID 매치가 경보 색으로 선다.
   *
   * 동선은 화면 깊이 방향이다. 배회 루프가 좌우로 서성이므로, 이 장면까지
   * 좌우로 오가면 카드 크기에서 두 기술이 같은 영상으로 읽힌다. 인물이
   * 차단봉 개구부를 지나 앞으로 나왔다가 다시 안으로 들어가는 움직임은
   * 원근(커졌다 작아졌다)으로 구분된다.
   */
  zoneReentry(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.3 : 1;

    // ── 배경: 실내 로비 ──────────────────────────────────────────────
    ctx.fillStyle = '#151920';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1c222c';
    ctx.fillRect(0, 0, W, H * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = (W / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.06);
      ctx.lineTo(x, H * 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(160,180,210,0.09)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(W * (0.08 + i * 0.33), H * 0.08, W * 0.05, H * 0.42);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, H * 0.495, W, 3 * S);
    for (let i = 0; i < 3; i++) {
      const lx = W * (0.2 + i * 0.3);
      const g = ctx.createRadialGradient(lx, H * 0.05, 0, lx, H * 0.05, H * 0.52);
      g.addColorStop(0, 'rgba(215,222,235,0.2)');
      g.addColorStop(1, 'rgba(215,222,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - H * 0.52, 0, H * 1.04, H * 0.62);
    }
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(0, H * 0.5, W, H * 0.5);
    for (let i = 0; i < 3; i++) {
      const lx = W * (0.2 + i * 0.3);
      const g = ctx.createLinearGradient(0, H * 0.5, 0, H);
      g.addColorStop(0, 'rgba(200,212,230,0.07)');
      g.addColorStop(1, 'rgba(200,212,230,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - W * 0.05, H * 0.5, W * 0.1, H * 0.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 7; i++) {
      const y = H * 0.5 + (i * i * 6 + i * 13) * S;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + i * 70 * S, H * 0.5);
      ctx.lineTo(W * 0.5 + i * 230 * S, H);
      ctx.stroke();
    }

    // ── 경호 구역: 화면 안쪽(위). 차단봉 벽이 가로로 서고 가운데가 개구부다 ──
    const lineY = H * 0.74;
    ctx.fillStyle = 'rgba(123,163,208,0.09)';
    ctx.fillRect(0, H * 0.5, W, lineY - H * 0.5);
    ctx.setLineDash([14 * S, 9 * S]);
    ctx.strokeStyle = 'rgba(123,163,208,0.55)';
    ctx.lineWidth = 2.5 * S * z;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(W, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!opts?.compact) {
      label(ctx, 'PROTECTED ZONE', 28 * S, H * 0.545, 'rgba(123,163,208,0.7)', 15 * S);
    }

    // ── 인물: 가림막 뒤에서 나타나 앞으로 나왔다가, 다시 들어가 사라진다 ──
    /*
      키프레임은 화면 y(깊이). t=0 과 t=1 이 같아 루프가 이어진다.
      가림막(y<0.665 에서 가려짐) 기준의 사건 시각:
        나타남 0.078 (첫 등장 — ID 047 부여)
        사라짐 0.417 (가림막 뒤로)
        다시 나타남 0.5075 (RE-ID 매치 — 여기부터 경보 색)
        사라짐 0.845
      포스터 프레임(t=0.72)은 매치 이후 화면 앞에 크게 잡힌 모습이다.
    */
    const K = [
      [0, 0.6], [0.12, 0.7], [0.2, 0.84], [0.3, 0.88], [0.42, 0.66],
      [0.47, 0.62], [0.52, 0.68], [0.62, 0.86], [0.72, 0.88], [0.86, 0.64], [1, 0.6],
    ];
    function yAt(tt) {
      for (let i = 1; i < K.length; i++) {
        if (tt <= K[i][0]) {
          const k = (tt - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
          return (K[i - 1][1] + k * (K[i][1] - K[i - 1][1])) * H;
        }
      }
      return K[K.length - 1][1] * H;
    }
    const scaleAt = (yy) => 0.55 + 0.45 * Math.min(1, Math.max(0, (yy / H - 0.58) / 0.3));

    const hideY = H * 0.665;
    const APPEAR_FIRST = 0.078;
    const APPEAR_MATCH = 0.5075;

    const y = yAt(t);
    const x = W * 0.52 + Math.sin(t * Math.PI * 6) * W * 0.012;
    const h = H * WALKER_H * z * scaleAt(y);
    const visible = y >= hideY;
    const matched = t >= APPEAR_MATCH;
    const outside = y > lineY;

    // 이동 궤적 — 가림막 뒤 구간은 남기지 않는다 (보이지 않는 동선이므로)
    for (let k = 2; k <= 26; k += 2) {
      const tk = Math.max(0, t - k * 0.011);
      const py = yAt(tk);
      if (py < hideY) continue;
      const px = W * 0.52 + Math.sin(tk * Math.PI * 6) * W * 0.012;
      ctx.fillStyle = matched ? `rgba(212,118,60,${0.32 - k * 0.011})` : `rgba(123,163,208,${0.3 - k * 0.01})`;
      ctx.beginPath();
      ctx.arc(px, py + 2 * S, 3.2 * S * scaleAt(py), 0, Math.PI * 2);
      ctx.fill();
    }

    const dy = yAt(Math.min(1, t + 0.015)) - yAt(Math.max(0, t - 0.015));
    const moving = Math.abs(dy) > 0.6 * S;

    const drawSubject = () =>
      walker(ctx, {
        x,
        y,
        h,
        phase: moving ? t * Math.PI * 26 : 0,
        stride: moving ? 0.9 : 0.15,
        facing: Math.cos(t * Math.PI * 6) >= 0 ? 1 : -1,
        tone: matched ? 'alert' : 'normal',
      });

    // 가림막 — 구역 안쪽의 파티션. 인물이 이 뒤로 사라졌다가 다시 나온다.
    const partBase = H * 0.7;
    const partW = W * 0.17;
    const partH = H * 0.34;
    const drawPartition = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(W * 0.52, partBase, partW * 0.56, 4 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222a36';
      ctx.fillRect(W * 0.52 - partW / 2, partBase - partH, partW, partH);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(W * 0.52 - partW / 2, partBase - partH, partW, 3 * S);
      ctx.fillRect(W * 0.52 - partW / 2, partBase - partH, 6 * S, partH);
      if (!opts?.compact) {
        label(ctx, 'SCREEN', W * 0.52 - partW / 2 + 10 * S, partBase - partH + 22 * S, 'rgba(255,255,255,0.3)', 12 * S);
      }
    };

    // 차단봉 벽 — 개구부(중앙)를 비우고 좌우로 로프가 이어진다
    const gapL = W * 0.4;
    const gapR = W * 0.64;
    const posts = [W * 0.06, W * 0.23, gapL, gapR, W * 0.81, W * 0.97];
    const postH = H * 0.11;
    const drawBarrier = () => {
      for (let i = 0; i < posts.length; i++) {
        const px = posts[i];
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(px, lineY, 10 * S, 3.2 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#39424f';
        ctx.fillRect(px - 2.5 * S, lineY - postH, 5 * S, postH);
        ctx.fillStyle = '#4a5566';
        ctx.beginPath();
        ctx.arc(px, lineY - postH, 4.2 * S, 0, Math.PI * 2);
        ctx.fill();
        if (i > 0 && !(posts[i - 1] === gapL && px === gapR)) {
          const qx = posts[i - 1];
          ctx.strokeStyle = 'rgba(196,160,66,0.6)';
          ctx.lineWidth = 2.4 * S;
          ctx.beginPath();
          ctx.moveTo(qx, lineY - postH * 0.9);
          ctx.quadraticCurveTo((qx + px) / 2, lineY - postH * 0.66, px, lineY - postH * 0.9);
          ctx.stroke();
        }
      }
    };

    /*
      그리는 순서가 원근이다. 인물 발 위치(y)에 따라 가림막(0.7)과
      차단봉(0.74)의 앞뒤가 갈린다.
    */
    if (y < partBase) {
      drawSubject();
      drawPartition();
      drawBarrier();
    } else if (y <= lineY) {
      drawPartition();
      drawSubject();
      drawBarrier();
    } else {
      drawPartition();
      drawBarrier();
      drawSubject();
    }

    // 배경의 경호 인원 — 구역 안쪽에 정지, 흐리게
    if (!opts?.compact) {
      walker(ctx, {
        x: W * 0.15,
        y: H * 0.63,
        h: H * 0.11,
        phase: 0,
        stride: 0.12,
        facing: 1,
        tone: 'dim',
      });
    }

    /*
      매치 링 — 나타나는 순간 인물을 중심으로 링이 퍼진다.
      첫 등장은 추적 시작(파랑), 두 번째 등장은 재식별(주황)이다.
      "아까 그 사람" 이라는 판정이 이 링과 고정 ID 로 보인다.
    */
    for (const [start, isMatch] of [[APPEAR_FIRST, false], [APPEAR_MATCH, true]]) {
      const p = (t - start) / 0.12;
      if (p < 0 || p > 1 || !visible) continue;
      const cx = x;
      const cy = y - h * 0.5;
      for (const rr of [0.5, 0.72]) {
        ctx.strokeStyle = isMatch
          ? `rgba(224,150,92,${0.75 * (1 - p)})`
          : `rgba(123,163,208,${0.65 * (1 - p)})`;
        ctx.lineWidth = 2.6 * S * z;
        ctx.beginPath();
        ctx.arc(cx, cy, h * (rr + p * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (visible) {
      bbox(
        ctx,
        x - h * 0.26,
        y - h - h * 0.06,
        h * 0.52,
        h + h * 0.1,
        matched ? ALERT : AI,
        // ID 는 등장 내내 같은 번호다 — 재등장에서 같은 번호가 다시 붙는 것이 Re-ID 다
        matched ? 'RE-ID · ID 047' : 'ID 047 · 0.95',
        S * z * 0.9,
      );
    }

    if (!opts?.compact) {
      const status = !visible
        ? 'ID 047 · OUT OF VIEW'
        : matched
          ? 'RE-ID MATCH · ID 047 (0.97)'
          : 'TRACKING · ID 047';
      label(
        ctx,
        status,
        28 * S,
        H * 0.545 + 24 * S,
        matched ? 'rgba(224,150,92,0.95)' : 'rgba(255,255,255,0.6)',
        15 * S,
      );
    }

    if (matched && visible) {
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 12 · 경호 구역 A', matched && visible, 'RE-ID', 'TRACKING');
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
