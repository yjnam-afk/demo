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
const FIG_TONES = {
  alert: { jacket: 'rgba(224,150,92,0.95)', pants: 'rgba(176,108,62,0.95)', back: 'rgba(140,84,48,0.9)', arm: 'rgba(200,128,74,0.95)', head: 'rgba(238,190,146,0.95)', hair: 'rgba(168,104,56,0.95)' },
  normal: { jacket: 'rgba(196,204,216,0.88)', pants: 'rgba(132,142,158,0.85)', back: 'rgba(104,112,126,0.8)', arm: 'rgba(168,177,192,0.85)', head: 'rgba(222,208,192,0.92)', hair: 'rgba(124,96,68,0.95)' },
  dim: { jacket: 'rgba(150,158,172,0.4)', pants: 'rgba(110,118,132,0.38)', back: 'rgba(92,100,114,0.35)', arm: 'rgba(130,138,152,0.38)', head: 'rgba(170,164,152,0.42)', hair: 'rgba(122,110,96,0.42)' },
};

function walker(ctx, { x, y, h, phase, stride, facing, tone }) {
  const c = FIG_TONES[tone] ?? FIG_TONES.normal;

  /*
    인체 비례(약 7.5등신) 실루엣.
     - 엉덩이-무릎-발목 / 어깨-팔꿈치-손 2관절 사슬: 걸을 때 무릎·팔꿈치가 굽는다
     - 골반 블록이 상체와 다리를 잇고, 상체는 가슴 쪽이 앞으로 나온 옆모습이다
     - 머리는 머리카락 + 얼굴 + 코: 옆얼굴로 읽히는 최소 구성
     - 보행 바운스와 상체 앞기울임: 걷는 몸의 리듬
     - 먼 쪽 팔다리는 어두운 톤(원근), 상체에는 좌우 명암(부피)
  */
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 그림자 — 넓고 옅은 층 위에 좁고 진한 접지가 겹친다. 한 겹이면 스티커처럼 뜬다
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.014, h * 0.27, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.012, h * 0.17, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  const walkAmount = Math.min(1, stride);
  const drop = Math.abs(Math.sin(phase)) * h * 0.018 * walkAmount;
  // 걸을 때 상체가 진행 방향으로 살짝 기운다 — 어깨 높이 좌표를 앞으로 민다
  const leanX = facing * h * 0.026 * walkAmount;
  const hipY = y - h * 0.5 + drop;
  const shoulderY = y - h * 0.79 + drop;
  const thigh = h * 0.25;
  const shin = h * 0.25;
  const upperArm = h * 0.155;
  const forearm = h * 0.14;

  const leg = (p, rest, color) => {
    const swing = Math.sin(p) * 0.5 * stride;
    const bend = Math.max(0, Math.sin(p - 1.1)) * 0.85 * stride + 0.05;
    const kx = x + facing * (Math.sin(swing) * thigh + rest);
    const ky = hipY + Math.cos(swing) * thigh;
    const ax = kx + facing * Math.sin(swing - bend) * shin;
    const ay = ky + Math.cos(swing - bend) * shin;
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.078;
    ctx.beginPath();
    ctx.moveTo(x + facing * rest * 0.3, hipY);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.lineWidth = h * 0.052;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    // 원통 하이라이트 — 위왼쪽 광원. 평면 획이 다리 부피로 읽히게 한다
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = h * 0.024;
    ctx.beginPath();
    ctx.moveTo(x + facing * rest * 0.3 - h * 0.011, hipY - h * 0.008);
    ctx.lineTo(kx - h * 0.011, ky - h * 0.008);
    ctx.stroke();
    // 신발 — 앞으로 나갈 때 발끝이 들리고, 뒤로 밀 때 발끝이 처진다
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-facing * swing * 0.55);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(facing > 0 ? -h * 0.02 : -h * 0.075, -h * 0.016, h * 0.095, h * 0.03, h * 0.012);
    ctx.fill();
    ctx.restore();
  };

  const arm = (p, color, width, handColor) => {
    const swing = Math.sin(p) * 0.42 * stride;
    const sx = x + leanX + facing * h * 0.005;
    const sy = shoulderY + h * 0.02;
    const ex = sx + facing * Math.sin(swing) * upperArm;
    const ey = sy + Math.cos(swing) * upperArm;
    const hx = ex + facing * Math.sin(swing + 0.45) * forearm;
    const hy = ey + Math.cos(swing + 0.45) * forearm;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // 팔뚝은 위팔보다 가늘다
    ctx.lineWidth = width * 0.82;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // 소매 하이라이트 — 위팔 위쪽 모서리에 가는 빛
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = width * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx - h * 0.008, sy - h * 0.006);
    ctx.lineTo(ex - h * 0.008, ey - h * 0.006);
    ctx.stroke();
    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.arc(hx, hy + h * 0.012, h * 0.023, 0, Math.PI * 2);
    ctx.fill();
  };

  // 먼 쪽부터 — 팔, 다리 (어두운 톤이 뒤에 깔린다)
  arm(phase, c.back, h * 0.044, c.back);
  leg(phase + Math.PI, -h * 0.016, c.back);
  leg(phase, h * 0.016, c.pants);

  // 골반 — 상체와 다리를 잇는 엉덩이 블록. 없으면 다리가 판에서 돋아난다.
  ctx.fillStyle = c.pants;
  ctx.beginPath();
  ctx.roundRect(x - h * 0.062, hipY - h * 0.032, h * 0.124, h * 0.078, h * 0.03);
  ctx.fill();

  /* 상체 — 어깨는 승모근 경사, 가슴 쪽이 등보다 앞으로 나온 옆모습.
     같은 경로에 명암을 겹쳐 부피를 만든다. */
  const front = facing;
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(x + leanX - h * 0.084, shoulderY + h * 0.012);
    ctx.quadraticCurveTo(x + leanX - h * 0.04, shoulderY - h * 0.018, x + leanX, shoulderY - h * 0.02);
    ctx.quadraticCurveTo(x + leanX + h * 0.04, shoulderY - h * 0.018, x + leanX + h * 0.084, shoulderY + h * 0.012);
    // 앞면(진행 방향) — 가슴이 등보다 조금 더 나온다
    ctx.quadraticCurveTo(
      x + leanX * 0.5 + h * 0.09 + front * h * 0.012,
      shoulderY + h * 0.12,
      x + h * 0.058,
      hipY - h * 0.015,
    );
    ctx.lineTo(x - h * 0.058, hipY - h * 0.015);
    ctx.quadraticCurveTo(x + leanX * 0.5 - h * 0.09, shoulderY + h * 0.12, x + leanX - h * 0.084, shoulderY + h * 0.012);
    ctx.closePath();
  };
  torso();
  ctx.fillStyle = c.jacket;
  ctx.fill();
  const shade = ctx.createLinearGradient(x - facing * h * 0.084, 0, x + facing * h * 0.084, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.16)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(255,255,255,0.1)');
  torso();
  ctx.fillStyle = shade;
  ctx.fill();

  // 목
  ctx.strokeStyle = c.head;
  ctx.lineWidth = h * 0.038;
  ctx.beginPath();
  ctx.moveTo(x + leanX + facing * h * 0.012, shoulderY + h * 0.004);
  ctx.lineTo(x + leanX + facing * h * 0.024, shoulderY - h * 0.042);
  ctx.stroke();

  /* 머리 — 머리카락 층 + 앞아래 얼굴 + 코끝. */
  const hx = x + leanX + facing * h * 0.028;
  const hy = shoulderY - h * 0.103 + drop * 0.3;
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy, h * 0.06, h * 0.071, facing * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // 뒷목 머리선
  ctx.beginPath();
  ctx.ellipse(hx - facing * h * 0.038, hy + h * 0.05, h * 0.024, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  // 머리카락 하이라이트 — 정수리에 도는 빛이 공 모양의 부피를 만든다
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = h * 0.014;
  ctx.beginPath();
  ctx.ellipse(hx - facing * h * 0.006, hy - h * 0.022, h * 0.042, h * 0.036, facing * 0.2, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.ellipse(hx + facing * h * 0.03, hy + h * 0.026, h * 0.034, h * 0.044, facing * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // 코끝 — 옆얼굴을 만드는 작은 돌출
  ctx.beginPath();
  ctx.arc(hx + facing * h * 0.063, hy + h * 0.026, h * 0.012, 0, Math.PI * 2);
  ctx.fill();
  // 귀 — 머리 옆면 중심에 살빛 점. 옆얼굴 방향을 잡아 준다
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.ellipse(hx - facing * h * 0.002, hy + h * 0.03, h * 0.011, h * 0.016, 0, 0, Math.PI * 2);
  ctx.fill();

  // 가까운 팔 — 몸통 위에 얹힌다
  arm(phase + Math.PI, c.arm, h * 0.048, c.head);

  ctx.restore();
}

/** 쓰러지는/쓰러진 자세. k 0 = 서 있음 → 1 = 앞으로 엎어짐 (관절 보간).
    키를 줄이거나 통째로 회전시키면 사람이 작아지거나 통나무가 된다 —
    관절이 실제 경로로 움직여야 몸의 부피가 끝까지 유지된다. */
function fallFigure(ctx, { x, y, h, facing, tone, k = 1 }) {
  const c = FIG_TONES[tone] ?? FIG_TONES.normal;
  const f = facing;
  const L = (a, b) => a + (b - a) * k;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 그림자 — 누울수록 길어진다
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + f * h * 0.3 * k, y + h * 0.012, h * L(0.2, 0.5), h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  const hip = { x: x + f * h * L(0, 0.3), y: y - h * L(0.5, 0.085) };
  const sho = { x: x + f * h * L(0.01, 0.6), y: y - h * L(0.79, 0.1) };

  // 다리 — 무릎이 굽으며 무너지고, 발은 제자리 근처에 남는다
  const leg = (off, color) => {
    const knee = { x: x + f * h * (L(0.02, 0.14) + off), y: y - h * L(0.26, 0.14) };
    const ank = { x: x + f * h * (L(0.02, -0.06) + off), y: y - h * L(0.025, 0.05) };
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.078;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();
    ctx.lineWidth = h * 0.052;
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(ank.x, ank.y);
    ctx.stroke();
    ctx.save();
    ctx.translate(ank.x, ank.y);
    ctx.rotate(f * L(0, 1.1));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-h * 0.02, -h * 0.015, h * 0.09, h * 0.028, h * 0.012);
    ctx.fill();
    ctx.restore();
  };
  leg(-0.03, c.back);
  leg(0, c.pants);

  // 골반 — 상체 방향을 따라 눕는다
  const ang = Math.atan2(sho.x - hip.x, hip.y - sho.y);
  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.rotate(ang);
  ctx.fillStyle = c.pants;
  ctx.beginPath();
  ctx.roundRect(-h * 0.062, -h * 0.04, h * 0.124, h * 0.08, h * 0.03);
  ctx.fill();
  ctx.restore();

  // 상체 — 엉덩이→어깨 방향 사다리꼴. 두께가 유지되어 납작해지지 않는다.
  const dx = sho.x - hip.x;
  const dy = sho.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const wTop = h * 0.082;
  const wBot = h * 0.064;
  ctx.fillStyle = c.jacket;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * wBot, hip.y + ny * wBot);
  ctx.lineTo(sho.x + nx * wTop, sho.y + ny * wTop);
  ctx.quadraticCurveTo(sho.x + ux * h * 0.03, sho.y + uy * h * 0.03, sho.x - nx * wTop, sho.y - ny * wTop);
  ctx.lineTo(hip.x - nx * wBot, hip.y - ny * wBot);
  ctx.closePath();
  ctx.fill();

  // 팔 — 쓰러지며 앞으로 뻗어 바닥을 짚는다
  const elb = { x: L(sho.x + f * h * 0.015, x + f * h * 0.5), y: y - h * L(0.62, 0.17) };
  const hand = { x: L(sho.x + f * h * 0.02, x + f * h * 0.44), y: y - h * L(0.46, 0.045) };
  ctx.strokeStyle = c.arm;
  ctx.lineWidth = h * 0.048;
  ctx.beginPath();
  ctx.moveTo(sho.x, sho.y);
  ctx.lineTo(elb.x, elb.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, h * 0.023, 0, Math.PI * 2);
  ctx.fill();

  // 목 + 머리 — 상체 방향의 연장선에 눕는다
  const hx = sho.x + ux * h * 0.145;
  const hy = sho.y + uy * h * 0.145;
  ctx.strokeStyle = c.head;
  ctx.lineWidth = h * 0.038;
  ctx.beginPath();
  ctx.moveTo(sho.x + ux * h * 0.01, sho.y + uy * h * 0.01);
  ctx.lineTo(sho.x + ux * h * 0.055, sho.y + uy * h * 0.055);
  ctx.stroke();
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy, h * 0.06, h * 0.068, ang, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.ellipse(hx + ux * h * 0.026 + f * h * 0.012, hy + uy * h * 0.026 + h * 0.012, h * 0.034, h * 0.042, ang, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 무릎을 세우고 바닥에 앉은 자세 — 주저앉음 장면 */
function sittingFigure(ctx, { x, y, h, facing, tone, k = 1 }) {
  /*
    바닥에 앉은/앉는 중인 자세. k 0 = 서 있음 → 1 = 완전히 앉음.
    키를 줄여 앉히면 사람이 작아지는 것으로 읽히므로, 서 있는 관절에서
    앉은 관절로 보간해 엉덩이가 내려가고 무릎이 앞으로 올라오게 그린다.
    머리·골반·신발 구성은 걷는 인물(walker)과 같다.
  */
  const c = FIG_TONES[tone] ?? FIG_TONES.normal;
  const f = facing;
  const L = (a, b) => a + (b - a) * k;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + f * h * 0.05 * k, y + h * 0.01, h * (0.2 + 0.06 * k), h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const hip = { x: x - f * h * L(0, 0.05), y: y - h * L(0.5, 0.08) };
  const sho = { x: x - f * h * L(-0.01, 0.03), y: y - h * L(0.79, 0.47) };

  const leg = (off, color) => {
    const knee = { x: x + f * h * (L(0.02, 0.12) + off), y: y - h * L(0.26, 0.29) };
    const ank = { x: x + f * h * (L(0.02, 0.22) + off), y: y - h * 0.025 };
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.075;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();
    ctx.lineWidth = h * 0.052;
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(ank.x, ank.y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(ank.x - (f > 0 ? h * 0.02 : h * 0.075), ank.y - h * 0.014, h * 0.095, h * 0.028, h * 0.012);
    ctx.fill();
    return knee;
  };
  leg(-0.03, c.back);
  const kneeN = leg(0, c.pants);

  // 골반
  ctx.fillStyle = c.pants;
  ctx.beginPath();
  ctx.roundRect(hip.x - h * 0.062, hip.y - h * 0.035, h * 0.124, h * 0.08, h * 0.03);
  ctx.fill();

  // 상체 — 엉덩이→어깨 방향을 따라 세운 사다리꼴
  const dx = sho.x - hip.x;
  const dy = sho.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const wTop = h * 0.082;
  const wBot = h * 0.064;
  ctx.fillStyle = c.jacket;
  ctx.beginPath();
  ctx.moveTo(hip.x + nx * wBot, hip.y + ny * wBot);
  ctx.lineTo(sho.x + nx * wTop, sho.y + ny * wTop);
  ctx.quadraticCurveTo(sho.x + f * h * 0.004, sho.y - h * 0.024, sho.x - nx * wTop, sho.y - ny * wTop);
  ctx.lineTo(hip.x - nx * wBot, hip.y - ny * wBot);
  ctx.closePath();
  ctx.fill();

  // 팔 — 손이 무릎으로 내려간다
  const elb = { x: L(sho.x + f * h * 0.015, x + f * h * 0.06), y: y - h * L(0.62, 0.33) };
  const hand = { x: L(sho.x + f * h * 0.02, kneeN.x), y: y - h * L(0.46, 0.3) };
  ctx.strokeStyle = c.arm;
  ctx.lineWidth = h * 0.048;
  ctx.beginPath();
  ctx.moveTo(sho.x + f * h * 0.005, sho.y + h * 0.02);
  ctx.lineTo(elb.x, elb.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y + h * 0.01, h * 0.023, 0, Math.PI * 2);
  ctx.fill();

  // 목 + 머리 — 걷는 인물과 같은 구성 (머리카락 + 얼굴 + 코)
  ctx.strokeStyle = c.head;
  ctx.lineWidth = h * 0.038;
  ctx.beginPath();
  ctx.moveTo(sho.x + f * h * 0.01, sho.y + h * 0.005);
  ctx.lineTo(sho.x + f * h * 0.022, sho.y - h * 0.04);
  ctx.stroke();
  const hx = sho.x + f * h * 0.028;
  const hy = sho.y - h * 0.1;
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy, h * 0.06, h * 0.071, f * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx - f * h * 0.038, hy + h * 0.05, h * 0.024, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.ellipse(hx + f * h * 0.03, hy + h * 0.026, h * 0.034, h * 0.044, f * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + f * h * 0.063, hy + h * 0.026, h * 0.012, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 정면(카메라 쪽)을 바라보는 자세 — 응시 장면 전용. 눈이 카메라를 본다. */
function frontFigure(ctx, { x, y, h, tone }) {
  const c = FIG_TONES[tone] ?? FIG_TONES.normal;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.012, h * 0.17, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  const hipY = y - h * 0.5;
  const shoulderY = y - h * 0.79;
  // 다리 — 정면이라 두 기둥, 발은 좌우로 벌어진다
  for (const d of [-1, 1]) {
    const color = d === 1 ? c.pants : c.back;
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.07;
    ctx.beginPath();
    ctx.moveTo(x + d * h * 0.032, hipY);
    ctx.lineTo(x + d * h * 0.042, y - h * 0.02);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + d * h * 0.042 - h * 0.033, y - h * 0.03, h * 0.066, h * 0.03, h * 0.012);
    ctx.fill();
  }
  // 골반
  ctx.fillStyle = c.pants;
  ctx.beginPath();
  ctx.roundRect(x - h * 0.066, hipY - h * 0.032, h * 0.132, h * 0.075, h * 0.03);
  ctx.fill();
  // 몸통 — 좌우 대칭, 어깨 경사
  ctx.fillStyle = c.jacket;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.09, shoulderY + h * 0.014);
  ctx.quadraticCurveTo(x - h * 0.045, shoulderY - h * 0.02, x, shoulderY - h * 0.022);
  ctx.quadraticCurveTo(x + h * 0.045, shoulderY - h * 0.02, x + h * 0.09, shoulderY + h * 0.014);
  ctx.quadraticCurveTo(x + h * 0.095, shoulderY + h * 0.12, x + h * 0.062, hipY - h * 0.015);
  ctx.lineTo(x - h * 0.062, hipY - h * 0.015);
  ctx.quadraticCurveTo(x - h * 0.095, shoulderY + h * 0.12, x - h * 0.09, shoulderY + h * 0.014);
  ctx.closePath();
  ctx.fill();
  // 팔 — 양옆으로 늘어뜨린다
  for (const d of [-1, 1]) {
    ctx.strokeStyle = d === 1 ? c.arm : c.back;
    ctx.lineWidth = h * 0.046;
    ctx.beginPath();
    ctx.moveTo(x + d * h * 0.085, shoulderY + h * 0.025);
    ctx.lineTo(x + d * h * 0.105, y - h * 0.51);
    ctx.lineTo(x + d * h * 0.095, y - h * 0.38);
    ctx.stroke();
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.arc(x + d * h * 0.095, y - h * 0.365, h * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  // 목
  ctx.strokeStyle = c.head;
  ctx.lineWidth = h * 0.04;
  ctx.beginPath();
  ctx.moveTo(x, shoulderY + h * 0.004);
  ctx.lineTo(x, shoulderY - h * 0.04);
  ctx.stroke();
  // 머리 — 정면. 머리카락이 위·옆을 두르고 얼굴이 가운데에 온다.
  const hy = shoulderY - h * 0.105;
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.ellipse(x, hy, h * 0.058, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.ellipse(x, hy + h * 0.012, h * 0.043, h * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();
  // 눈 — 카메라(시청자)를 본다. 이 두 점이 "응시" 다.
  ctx.fillStyle = 'rgba(20,24,30,0.85)';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + d * h * 0.018, hy + h * 0.004, h * 0.0068, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 탐지 순간의 링 — 판정이 "지금" 섰음을 보인다 */
function detectPulse(ctx, x, y, r, p, S, rgb = '224,150,92') {
  if (p < 0 || p > 1) return;
  ctx.lineWidth = 2.6 * S;
  for (const rr of [1, 1.3]) {
    ctx.strokeStyle = `rgba(${rgb},${0.7 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(x, y, r * (rr + p * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** 불꽃 — 겹친 세 장의 혀가 흔들리고 불티·연기가 오른다. size 는 불길 높이. */
function flame(ctx, x, y, size, t) {
  const glow = ctx.createRadialGradient(x, y - size * 0.3, 0, x, y - size * 0.3, size * 1.6);
  glow.addColorStop(0, 'rgba(230,140,60,0.28)');
  glow.addColorStop(1, 'rgba(230,140,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 1.6, y - size * 1.9, size * 3.2, size * 2.4);
  const layers = [
    [1, 'rgba(214,110,46,0.9)'],
    [0.66, 'rgba(236,168,84,0.92)'],
    [0.38, 'rgba(248,222,150,0.95)'],
  ];
  for (let i = 0; i < layers.length; i++) {
    const [k, color] = layers[i];
    const hgt = size * k;
    const sway = Math.sin(t * Math.PI * 2 * 9 + i * 2.1) * size * 0.09 * (1 + i * 0.4);
    const wob = 1 + Math.sin(t * Math.PI * 2 * 13 + i * 1.3) * 0.08;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.34 * k, y);
    ctx.quadraticCurveTo(x - size * 0.38 * k, y - hgt * 0.55, x + sway, y - hgt * wob);
    ctx.quadraticCurveTo(x + size * 0.38 * k, y - hgt * 0.55, x + size * 0.34 * k, y);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const ph = (t * (1.4 + (i % 3) * 0.5) + i * 0.17) % 1;
    const sx = x + Math.sin(i * 7.3 + t * Math.PI * 4) * size * 0.3;
    ctx.fillStyle = `rgba(245,190,110,${0.7 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(sx, y - size * (0.5 + ph * 1.1), size * 0.02 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.7 + i * 0.25) % 1;
    ctx.fillStyle = `rgba(150,150,160,${0.12 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 3.1 + ph * 5) * size * 0.35, y - size * (1 + ph * 1.3), size * (0.18 + ph * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 실내 행사장 배경 — 이상행동 장면들이 공유한다 */
/** 자리 고정 난수 — 프레임(t)과 무관하게 자리마다 같은 값. 바닥 얼룩처럼
    프레임마다 바뀌면 번쩍이는 질감에 쓴다. */
function staticRand(i) {
  const v = Math.sin(i * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** 바닥 질감 — 타일별 명암 얼룩 + 광택 바닥의 조명 반사 스트릭.
    실내 바닥이 "면" 이 아니라 "재질" 로 읽히게 만드는 두 요소다. */
function floorTexture(ctx, W, H, S, horizon, lights) {
  for (let row = 0; row < 6; row++) {
    const y0 = horizon + (row * row * 6 + row * 14) * S;
    const y1 = horizon + ((row + 1) ** 2 * 6 + (row + 1) * 14) * S;
    if (y0 > H) break;
    const cols = Math.max(6, Math.round(14 - row * 1.5));
    for (let col = 0; col < cols; col++) {
      const r = staticRand(row * 131 + col * 17.7);
      if (r < 0.5) continue;
      const a = (r - 0.5) * 0.05;
      ctx.fillStyle = r > 0.8
        ? `rgba(255,255,255,${a.toFixed(3)})`
        : `rgba(0,0,0,${(a * 1.5).toFixed(3)})`;
      ctx.fillRect((W / cols) * col, y0, W / cols - 2 * S, Math.min(y1, H) - y0);
    }
  }
  for (const lx of lights) {
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, 'rgba(210,222,240,0.11)');
    g.addColorStop(0.5, 'rgba(210,222,240,0.04)');
    g.addColorStop(1, 'rgba(210,222,240,0)');
    ctx.fillStyle = g;
    const wgt = W * 0.045;
    ctx.beginPath();
    ctx.moveTo(lx - wgt * 0.4, horizon);
    ctx.lineTo(lx + wgt * 0.4, horizon);
    ctx.lineTo(lx + wgt * 1.7, H);
    ctx.lineTo(lx - wgt * 1.7, H);
    ctx.closePath();
    ctx.fill();
  }
}

/** 벤치 — 배경 소품. 알아볼 수 있는 실물이 하나 있으면 공간이 장소가 된다. */
function bench(ctx, x, y, w, S) {
  const h2 = w * 0.16;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h2 * 1.5, w * 0.55, h2 * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(52,48,44,0.95)';
  for (const lx of [x + w * 0.08, x + w * 0.85]) ctx.fillRect(lx, y + h2 * 0.4, w * 0.055, h2);
  const seat = ctx.createLinearGradient(0, y, 0, y + h2 * 0.5);
  seat.addColorStop(0, 'rgba(128,110,90,0.95)');
  seat.addColorStop(1, 'rgba(86,72,58,0.95)');
  ctx.fillStyle = seat;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h2 * 0.45, 3 * S);
  ctx.fill();
}

/** 입간판 — A자 스탠드 안내판. */
function signboard(ctx, x, y, hgt, S) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, hgt * 0.34, hgt * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(206,212,222,0.9)';
  ctx.beginPath();
  ctx.moveTo(x - hgt * 0.29, y);
  ctx.lineTo(x - hgt * 0.19, y - hgt);
  ctx.lineTo(x + hgt * 0.19, y - hgt);
  ctx.lineTo(x + hgt * 0.29, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(66,82,110,0.85)';
  ctx.fillRect(x - hgt * 0.16, y - hgt * 0.86, hgt * 0.32, hgt * 0.15);
  ctx.fillStyle = 'rgba(96,104,118,0.55)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - hgt * 0.14, y - hgt * (0.58 - i * 0.14), hgt * (0.28 - i * 0.06), hgt * 0.05);
  }
}

function hallBg(ctx, W, H, S) {
  const horizon = H * 0.52;

  // 공기 원근 — 벽 중단이 가장 밝고 앞바닥으로 오며 가라앉는다
  const air = ctx.createLinearGradient(0, 0, 0, H);
  air.addColorStop(0, '#242a33');
  air.addColorStop(0.5, '#2a303a');
  air.addColorStop(0.53, '#232830');
  air.addColorStop(1, '#191d24');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, W, H);

  // 벽 패널 — 이음매 사이 패널마다 명암이 조금씩 다르다(고정 난수)
  const panels = 9;
  for (let i = 0; i < panels; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(0.01 + staticRand(i * 3.13) * 0.028).toFixed(3)})`;
    ctx.fillRect((W / panels) * i + 1.5 * S, H * 0.055, W / panels - 3 * S, horizon - H * 0.055 - 8 * S);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1.5 * S;
  for (let i = 1; i < panels; i++) {
    const x = (W / panels) * i;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.05);
    ctx.lineTo(x, horizon - 8 * S);
    ctx.stroke();
  }

  // 문 — 좌우 벽에 하나씩. 문틀 그늘 + 문짝 명암 + 손잡이
  const door = (dx, dw) => {
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fillRect(dx - 3 * S, H * 0.24, dw + 6 * S, horizon - H * 0.24 - 8 * S);
    const leaf = ctx.createLinearGradient(dx, 0, dx + dw, 0);
    leaf.addColorStop(0, '#2e3540');
    leaf.addColorStop(0.5, '#39414e');
    leaf.addColorStop(1, '#2b323c');
    ctx.fillStyle = leaf;
    ctx.fillRect(dx, H * 0.25, dw, horizon - H * 0.25 - 9 * S);
    ctx.fillStyle = 'rgba(210,220,235,0.5)';
    ctx.fillRect(dx + dw * 0.72, H * 0.38, 3.5 * S, 14 * S);
  };
  door(W * 0.088, W * 0.052);
  door(W * 0.862, W * 0.05);

  // 비상구 표지 — 오른쪽 문 위. 녹색 발광이 야간 실내의 표식이다
  const ex = W * 0.887;
  const ey = H * 0.205;
  const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, 40 * S);
  glow.addColorStop(0, 'rgba(96,200,140,0.3)');
  glow.addColorStop(1, 'rgba(96,200,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ex - 40 * S, ey - 40 * S, 80 * S, 80 * S);
  ctx.fillStyle = 'rgba(70,160,110,0.85)';
  ctx.fillRect(ex - 17 * S, ey - 8 * S, 34 * S, 15 * S);

  // 행사 현수막 띠 + 벽 포스터(내용은 흐릿한 인쇄 블록)
  ctx.fillStyle = 'rgba(95,122,160,0.16)';
  ctx.fillRect(0, H * 0.115, W, H * 0.055);
  for (const [px, pw] of [[0.31, 0.05], [0.55, 0.06]]) {
    ctx.fillStyle = 'rgba(200,210,225,0.1)';
    ctx.fillRect(W * px, H * 0.27, W * pw, H * 0.16);
    ctx.fillStyle = 'rgba(120,140,170,0.18)';
    ctx.fillRect(W * px + 4 * S, H * 0.28, W * pw - 8 * S, H * 0.05);
  }

  // 천장 조명 — 광원 띠가 보이고, 빛 웅덩이가 아래로 퍼진다
  const lights = [W * 0.18, W * 0.5, W * 0.82];
  for (const lx of lights) {
    ctx.fillStyle = 'rgba(228,236,248,0.5)';
    ctx.fillRect(lx - 44 * S, H * 0.028, 88 * S, 5 * S);
    const g = ctx.createRadialGradient(lx, H * 0.05, 0, lx, H * 0.05, H * 0.55);
    g.addColorStop(0, 'rgba(215,222,235,0.2)');
    g.addColorStop(1, 'rgba(215,222,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - H * 0.55, 0, H * 1.1, H * 0.65);
  }

  // 걸레받이와 벽·바닥 경계
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(0, horizon - 8 * S, W, 8 * S);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(0, horizon - 1.5 * S, W, 3 * S);

  // 바닥 원근 격자 — 이음매는 흐리게, 재질감은 floorTexture 가 만든다
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = horizon + (i * i * 6 + i * 14) * S;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(W * 0.5 + i * 80 * S, horizon);
    ctx.lineTo(W * 0.5 + i * 240 * S, H);
    ctx.stroke();
  }

  floorTexture(ctx, W, H, S, horizon, lights);

  // 소품 — 동작이 지나는 가운데를 피해 가장자리에 놓는다
  bench(ctx, W * 0.025, horizon + H * 0.05, W * 0.11, S);
  signboard(ctx, W * 0.755, horizon + H * 0.09, H * 0.125, S);
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
  vg.addColorStop(1, 'rgba(0,0,0,0.26)');
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
    // 아스팔트 얼룩 — 자리 고정 반점과 물때. 면이 재질로 읽힌다
    for (let i = 0; i < 130; i++) {
      const r = staticRand(i * 9.31);
      const px = staticRand(i * 3.7) * W;
      const py = H * 0.48 + staticRand(i * 5.9) * H * 0.52;
      const a = 0.015 + r * 0.035;
      ctx.fillStyle = r > 0.6 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${(a * 1.4).toFixed(3)})`;
      const sz = (2 + staticRand(i * 7.1) * 9) * S * (py / H);
      ctx.fillRect(px, py, sz * (1 + staticRand(i * 1.9) * 3), sz * 0.5);
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

    /*
      궤적은 넘은 다음에만 남긴다. 탐지가 선을 물고 있으므로, 선을 넘는
      순간 상자가 처음 나타나는 것이 이 기술의 화법이다.
    */
    if (crossed) {
      for (let k = 3; k <= 24; k += 3) {
        const pk = posAt(Math.max(0, t - k * 0.012));
        ctx.fillStyle = `rgba(212,118,60,${0.3 - k * 0.01})`;
        ctx.beginPath();
        ctx.arc(pk.x, baseY + 2 * S, 3 * S, 0, Math.PI * 2);
        ctx.fill();
      }
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

    if (crossed) {
      bbox(
        ctx,
        pos.x - h * 0.26,
        baseY - h - h * 0.06,
        h * 0.52,
        h + h * 0.1,
        ALERT,
        'INTRUSION 0.96',
        S * z * 0.9,
      );
    }

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

    // 바닥 재질 — 타일 얼룩과 조명 반사
    floorTexture(ctx, W, H, S, H * 0.52, [W * 0.14, W * 0.38, W * 0.62, W * 0.86]);
    // 승강장 벤치 — 오른쪽 벽 아래 배경 소품
    bench(ctx, W * 0.8, H * 0.555, W * 0.1, S);

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

    /*
      상자와 궤적은 배회 판정이 선 다음에만 그린다. 판정 전부터 상자가
      붙어 있으면 "이미 잡혀 있는" 화면이라 포착 순간이 없다 — 시스템은
      조용히 지켜보다가(체류 시간만 쌓인다) 임계에 닿는 순간 상자와 함께
      그동안의 동선을 증거로 편다.
    */
    if (flagged) {
      for (let k = 2; k <= 26; k += 2) {
        const tk = Math.max(0, t - k * 0.011);
        const px = W * 0.5 + Math.sin(tk * Math.PI * 3) * W * 0.21;
        ctx.fillStyle = `rgba(212,118,60,${0.34 - k * 0.011})`;
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
        ALERT,
        'LOITERING 0.91',
        S * z * 0.9,
      );
    }

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

    // 바닥 재질 — 타일 얼룩과 조명 반사
    floorTexture(ctx, W, H, S, H * 0.5, [W * 0.2, W * 0.5, W * 0.8]);

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


  /**
   * 가방에서 미상의 물체를 꺼내는 인원.
   * 가방을 어깨에 멘 채 걸어와 멈추고, 선 채로 가방에 손을 넣어 뒤지다
   * 물체가 나오는 순간 포착된다. 가방은 몸에 걸린 소지품이므로 사선
   * 스트랩과 옆구리에 걸린 몸통으로 항상 인물과 함께 움직인다.
   */
  bagObject(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.4 : 1;
    hallBg(ctx, W, H, S);

    const y = H * 0.88;
    const h = H * WALKER_H * z;
    const cx = W * 0.47;
    const DETECT = 0.6;
    const detected = t >= DETECT;

    /* 멘 가방 — 어깨에서 반대쪽 옆구리로 떨어지는 스트랩 + 허리 옆 가방.
       인물 위에 그려 몸에 걸린 것으로 보이게 한다. */
    const drawWornBag = (px, sway, jiggle) => {
      const strapTop = { x: px - h * 0.05, y: y - h * 0.76 };
      const bx = px + h * 0.17 + sway;
      const bagTop = y - h * 0.46;
      const bw = h * 0.21;
      const bh = h * 0.17;
      // 스트랩 — 상체를 가로지른다
      ctx.strokeStyle = '#2e3644';
      ctx.lineWidth = h * 0.034;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(strapTop.x, strapTop.y);
      ctx.lineTo(bx - h * 0.03, bagTop + h * 0.02);
      ctx.stroke();
      // 가방 몸통
      ctx.save();
      ctx.translate(bx, bagTop);
      ctx.rotate(jiggle);
      ctx.fillStyle = '#3b4454';
      ctx.beginPath();
      ctx.roundRect(-bw / 2, 0, bw, bh, h * 0.035);
      ctx.fill();
      // 덮개와 잠금쇠
      ctx.fillStyle = '#333b49';
      ctx.beginPath();
      ctx.roundRect(-bw / 2, 0, bw, bh * 0.42, h * 0.035);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(0, bh * 0.42, h * 0.012, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return { x: bx, y: bagTop };
    };

    if (t < 0.3) {
      // 접근 — 가방을 멘 채 걷는다. 가방이 걸음을 따라 흔들린다.
      const k = t / 0.3;
      const px = W * 0.14 + k * (cx - W * 0.14);
      walker(ctx, { x: px, y, h, phase: t * Math.PI * 24, stride: 0.9, facing: 1, tone: 'normal' });
      drawWornBag(px, Math.sin(t * Math.PI * 24) * h * 0.018, Math.sin(t * Math.PI * 24) * 0.04);
    } else {
      // 멈춰 서서 가방을 뒤진다
      walker(ctx, {
        x: cx,
        y,
        h,
        phase: 0,
        stride: 0.12,
        facing: 1,
        tone: detected ? 'alert' : 'normal',
      });
      const rummage = t > 0.4 && t < DETECT;
      const bag = drawWornBag(cx, 0, rummage ? Math.sin(t * Math.PI * 18) * 0.03 : 0);

      // 가방으로 내려가는 팔 — 손이 가방 입구에 붙는다
      if (t >= 0.34 && t < DETECT) {
        const reach = Math.min(1, (t - 0.34) / 0.1);
        const hx = bag.x - h * 0.02;
        const hy = bag.y + h * 0.02;
        ctx.strokeStyle = FIG_TONES.normal.arm;
        ctx.lineWidth = h * 0.048;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + h * 0.01, y - h * 0.77);
        ctx.quadraticCurveTo(
          cx + h * 0.14,
          y - h * 0.62,
          cx + h * 0.01 + (hx - cx - h * 0.01) * reach,
          y - h * 0.77 + (hy - y + h * 0.77) * reach,
        );
        ctx.stroke();
        ctx.fillStyle = FIG_TONES.normal.head;
        ctx.beginPath();
        ctx.arc(hx, hy + h * 0.01, h * 0.024, 0, Math.PI * 2);
        ctx.fill();
      }

      // 물체 — 가방 입구에서 나와 가슴 높이로 들려 올라간다
      if (detected) {
        const lift = Math.min(1, (t - DETECT) / 0.14);
        const ox = bag.x - h * 0.02 + (cx + h * 0.2 - bag.x + h * 0.02) * lift;
        const oy = bag.y + h * 0.02 - h * 0.3 * lift;
        ctx.strokeStyle = FIG_TONES.alert.arm;
        ctx.lineWidth = h * 0.048;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + h * 0.01, y - h * 0.77);
        ctx.lineTo(ox - h * 0.02, oy + h * 0.05);
        ctx.stroke();
        // 미상의 물체 — 어두운 막대. 경보 테두리가 정체 불명을 강조한다.
        ctx.fillStyle = '#141920';
        ctx.strokeStyle = ALERT;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.roundRect(ox - h * 0.024, oy - h * 0.14, h * 0.048, h * 0.19, 2.5 * S);
        ctx.fill();
        ctx.stroke();
        // 물체를 쥔 손
        ctx.fillStyle = FIG_TONES.alert.head;
        ctx.beginPath();
        ctx.arc(ox, oy + h * 0.04, h * 0.026, 0, Math.PI * 2);
        ctx.fill();
        detectPulse(ctx, ox, oy, h * 0.18, (t - DETECT) / 0.16, S * z);
        bbox(
          ctx,
          cx - h * 0.28,
          y - h - h * 0.02,
          h * 0.62,
          h + h * 0.06,
          ALERT,
          'UNKNOWN OBJECT 0.91',
          S * z * 0.9,
        );
      }
    }

    if (detected) {
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }
    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 21 · 소지품 검색대', detected, 'ALERT', 'MONITORING');
    }
  },



  /**
   * 옷에 손을 넣고 있는 인원.
   * 걸어와 멈춘 뒤 손을 상의 안으로 넣는다 — 은닉 자세가 유지되는 순간 포착.
   */
  concealedHand(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.4 : 1;
    hallBg(ctx, W, H, S);

    const y = H * 0.88;
    const h = H * WALKER_H * z;
    const DETECT = 0.5;
    const detected = t >= DETECT;

    let x;
    if (t < 0.35) {
      const k = t / 0.35;
      x = W * 0.82 - k * (W * 0.82 - W * 0.5);
      walker(ctx, { x, y, h, phase: t * Math.PI * 22, stride: 0.85, facing: -1, tone: 'normal' });
    } else {
      x = W * 0.5;
      // 멈춰 서서 — 좌우로 아주 조금 흔들린다
      walker(ctx, {
        x,
        y,
        h,
        phase: 0,
        stride: 0.12,
        facing: -1,
        tone: detected ? 'alert' : 'normal',
      });
      // 상의 안으로 들어가는 팔 — 손끝이 가슴에서 멈춘다
      const reach = Math.min(1, (t - 0.35) / 0.15);
      const chestX = x - h * 0.02;
      const chestY = y - h * 0.6;
      ctx.strokeStyle = detected ? FIG_TONES.alert.arm : FIG_TONES.normal.arm;
      ctx.lineWidth = h * 0.055;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - h * 0.09, y - h * 0.76);
      ctx.quadraticCurveTo(
        x - h * (0.2 - reach * 0.08),
        y - h * (0.66 - reach * 0.02),
        chestX - (1 - reach) * h * 0.16,
        chestY + (1 - reach) * h * 0.1,
      );
      ctx.stroke();
      // 은닉 지점 표식
      if (detected) {
        detectPulse(ctx, chestX, chestY, h * 0.14, (t - DETECT) / 0.14, S * z);
        ctx.fillStyle = 'rgba(224,150,92,0.9)';
        ctx.beginPath();
        ctx.arc(chestX, chestY, 4 * S * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (detected) {
      bbox(
        ctx,
        x - h * 0.28,
        y - h - h * 0.06,
        h * 0.56,
        h + h * 0.1,
        ALERT,
        'HAND CONCEALED 0.89',
        S * z * 0.9,
      );
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }
    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 22 · 출입 게이트', detected, 'ALERT', 'MONITORING');
    }
  },

  /**
   * 쓰러지는 인원.
   * 걷다가 무너지듯 앞으로 넘어지고, 바닥에 누운 순간 포착된다.
   */
  falldown(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.4 : 1;
    hallBg(ctx, W, H, S);

    const y = H * 0.88;
    const h = H * WALKER_H * z;
    const cx = W * 0.5;
    const FALL = 0.4;
    const DOWN = 0.52;
    const detected = t >= DOWN;

    if (t < FALL) {
      const k = t / FALL;
      const px = W * 0.16 + k * (cx - W * 0.16);
      walker(ctx, { x: px, y, h, phase: t * Math.PI * 24, stride: 0.9, facing: 1, tone: 'normal' });
    } else {
      /*
        무릎이 먼저 꺾이고 상체가 앞으로 무너지는 경로를 관절 보간으로
        그린다. 몸의 크기와 두께는 끝까지 그대로다.
      */
      const kRaw = Math.min(1, (t - FALL) / (DOWN - FALL));
      const k = kRaw * kRaw;
      fallFigure(ctx, { x: cx, y, h, facing: 1, tone: t >= DOWN ? 'alert' : 'normal', k });

      if (t >= DOWN) {
        // 착지 먼지 — 넘어짐의 충격을 잇는 완충
        if (t < DOWN + 0.12) {
          const p = (t - DOWN) / 0.12;
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = `rgba(170,175,185,${0.2 * (1 - p)})`;
            ctx.beginPath();
            ctx.arc(
              cx + h * 0.3 + (i - 2) * h * 0.22,
              y - h * 0.04 - p * h * 0.07 * (1 + (i % 2)),
              h * (0.03 + p * 0.05),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        detectPulse(ctx, cx + h * 0.35, y - h * 0.12, h * 0.3, (t - DOWN) / 0.14, S * z);
        bbox(
          ctx,
          cx - h * 0.16,
          y - h * 0.3,
          h * 0.95,
          h * 0.36,
          ALERT,
          'FALL DOWN 0.95',
          S * z * 0.9,
        );
        if (!opts?.compact) {
          const sec = String(Math.floor((t - DOWN) * 26)).padStart(2, '0');
          label(ctx, `DOWN 00:${sec}`, 28 * S, H * 0.57, 'rgba(224,150,92,0.95)', 16 * S);
        }
        ctx.fillStyle = 'rgba(212,118,60,0.06)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 15 · 중앙 홀', detected, 'ALERT', 'MONITORING');
    }
  },

  /**
   * 바닥에 주저 앉는 인원.
   * 천천히 내려앉아 무릎을 세우고 앉는다 — 일정 시간 지속되면 포착.
   * 쓰러짐(순간·수평)과 다른 동작이다: 느리게, 앉은 채 유지.
   */
  sittingFloor(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.4 : 1;
    hallBg(ctx, W, H, S);

    const y = H * 0.88;
    const h = H * WALKER_H * z;
    const cx = W * 0.52;
    const SIT = 0.5;
    const DETECT = 0.66; // 앉은 지 잠시 지난 뒤 — 지속이 판정 조건이다
    const detected = t >= DETECT;

    if (t < 0.35) {
      const k = t / 0.35;
      const x = W * 0.84 - k * (W * 0.84 - cx);
      walker(ctx, { x, y, h, phase: t * Math.PI * 20, stride: 0.75, facing: -1, tone: 'normal' });
    } else {
      /*
        앉는 동작은 인물을 축소하는 것이 아니라 관절 보간으로 그린다 —
        키를 줄이면 사람이 작아지는 것으로 읽힌다. 서 있는 관절에서
        앉은 관절로 이동하며 엉덩이가 내려가고 무릎이 올라온다.
      */
      const kRaw = Math.min(1, (t - 0.35) / (SIT - 0.35));
      const k = kRaw * kRaw * (3 - 2 * kRaw);
      sittingFigure(ctx, { x: cx, y, h, facing: -1, tone: detected ? 'alert' : 'normal', k });
      if (detected) {
        detectPulse(ctx, cx, y - h * 0.3, h * 0.28, (t - DETECT) / 0.14, S * z);
        bbox(
          ctx,
          cx - h * 0.3,
          y - h * 0.66,
          h * 0.6,
          h * 0.72,
          ALERT,
          'SITTING 0.88',
          S * z * 0.9,
        );
        ctx.fillStyle = 'rgba(212,118,60,0.06)';
        ctx.fillRect(0, 0, W, H);
      }
      if (!opts?.compact && t >= SIT) {
        const sec = String(Math.floor((t - SIT) * 30)).padStart(2, '0');
        label(
          ctx,
          `SIT 00:${sec}`,
          28 * S,
          H * 0.57,
          detected ? 'rgba(224,150,92,0.95)' : 'rgba(255,255,255,0.6)',
          16 * S,
        );
      }
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 16 · 복도', detected, 'ALERT', 'MONITORING');
    }
  },

  /**
   * 행사장내 현재 인원 계수.
   * 이벤트가 아니라 상시 계수다 — 화면 안의 인원마다 얇은 상자가 붙고,
   * 프레임을 드나들 때마다 숫자가 변한다.
   */
  peopleCounting(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    hallBg(ctx, W, H, S);

    const PEOPLE = [
      { s: 0.02, v: 0.6, yy: 0.63, f: 1 },
      { s: 0.55, v: -0.45, yy: 0.66, f: -1 },
      { s: 0.3, v: 0.38, yy: 0.7, f: 1 },
      { s: 0.85, v: -0.6, yy: 0.74, f: -1 },
      { s: 0.15, v: 0.52, yy: 0.79, f: 1 },
      { s: 0.7, v: 0.44, yy: 0.84, f: 1 },
      { s: 0.45, v: -0.36, yy: 0.88, f: -1 },
    ];

    let count = 0;
    for (const p of PEOPLE) {
      // 1.3 주기로 순환 — 화면 밖 구간(0.15)을 거쳐 드나든다
      const xf = ((((p.s + p.v * t) % 1.3) + 1.3) % 1.3) - 0.15;
      if (xf < 0.03 || xf > 0.97) continue;
      count += 1;
      const x = xf * W;
      const y = p.yy * H;
      const scale = 0.5 + ((p.yy - 0.63) / 0.25) * 0.5;
      const h = H * WALKER_H * scale;
      walker(ctx, {
        x,
        y,
        h,
        phase: (t * 30 * Math.abs(p.v) + p.s * 20) * Math.PI,
        stride: 0.85,
        facing: p.f,
        tone: 'normal',
      });
      // 계수 상자 — 라벨 없는 얇은 파란 상자. 세는 중이라는 표시다.
      ctx.strokeStyle = 'rgba(123,163,208,0.75)';
      ctx.lineWidth = 2 * S;
      ctx.strokeRect(x - h * 0.26, y - h - h * 0.04, h * 0.52, h + h * 0.08);
    }

    // 계수 숫자 — 이 장면의 주인공. 카드에서도 보인다.
    // 전체 화면에서는 하단 타임스탬프와 겹치지 않게 한 줄 위에 둔다.
    const nx = 28 * S;
    const ny = opts?.compact ? 54 * S : H - 78 * S;
    ctx.font = `600 ${Math.round((opts?.compact ? 44 : 54) * S)}px ui-monospace, monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(String(count), nx, ny);
    label(ctx, 'IN VIEW', nx, ny - (opts?.compact ? 34 : 44) * S, 'rgba(255,255,255,0.55)', 15 * S);

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 09 · 행사장 전경', false, 'ALERT', 'COUNTING');
    }
  },

  /**
   * CCTV를 여러번 응시하는 인원.
   * 걷다 멈춰 카메라(시청자)를 정면으로 바라보기를 반복한다 — 세 번째
   * 응시에서 포착된다. 응시는 머리에서 화면 쪽으로 퍼지는 시선 원뿔로 그린다.
   */
  cameraGaze(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.4 : 1;
    hallBg(ctx, W, H, S);

    const y = H * 0.88;
    const h = H * WALKER_H * z;
    /* 걷기와 응시 정지가 번갈아 온다. 세 번째 응시(0.62~)가 판정이다. */
    const K = [
      [0, 0.18], [0.1, 0.28], [0.2, 0.28], [0.36, 0.46], [0.5, 0.46],
      [0.62, 0.62], [0.8, 0.62], [1, 0.86],
    ];
    const GAZES = [
      [0.1, 0.2],
      [0.36, 0.5],
      [0.62, 0.8],
    ];
    function xAt(tt) {
      for (let i = 1; i < K.length; i++) {
        if (tt <= K[i][0]) {
          const k = (tt - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
          return (K[i - 1][1] + k * (K[i][1] - K[i - 1][1])) * W;
        }
      }
      return K[K.length - 1][1] * W;
    }

    const x = xAt(t);
    const gazeIndex = GAZES.findIndex(([a, b]) => t >= a && t < b);
    const gazing = gazeIndex >= 0;
    const gazeCount = GAZES.filter(([a]) => t >= a).length;
    const DETECT = GAZES[2][0];
    const detected = t >= DETECT;

    // 시선 원뿔 — CCTV 는 높이 달려 있으므로 시선이 위로 향한다
    if (gazing) {
      const hx = x;
      const hy = y - h * 0.9;
      const grad = ctx.createLinearGradient(0, hy, 0, 0);
      const tone = detected ? '224,150,92' : '200,212,230';
      grad.addColorStop(0, `rgba(${tone},${detected ? 0.24 : 0.15})`);
      grad.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - h * 0.42, 0);
      ctx.lineTo(hx + h * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      // 응시 시작 링
      detectPulse(
        ctx,
        hx,
        hy + h * 0.08,
        h * 0.16,
        (t - GAZES[gazeIndex][0]) / 0.1,
        S * z,
        detected ? '224,150,92' : '200,212,230',
      );
    }

    // 응시 중에는 몸을 돌려 카메라를 정면으로 본다 — 눈이 있는 정면 자세
    if (gazing) {
      frontFigure(ctx, { x, y, h, tone: detected ? 'alert' : 'normal' });
    } else {
      walker(ctx, {
        x,
        y,
        h,
        phase: t * Math.PI * 22,
        stride: 0.85,
        facing: 1,
        tone: detected ? 'alert' : 'normal',
      });
    }

    if (detected) {
      bbox(
        ctx,
        x - h * 0.28,
        y - h - h * 0.06,
        h * 0.56,
        h + h * 0.1,
        ALERT,
        'CAMERA GAZE 0.90',
        S * z * 0.9,
      );
      ctx.fillStyle = 'rgba(212,118,60,0.06)';
      ctx.fillRect(0, 0, W, H);
    }

    if (!opts?.compact) {
      label(
        ctx,
        `GAZE COUNT ${Math.min(gazeCount, 3)}/3`,
        28 * S,
        H * 0.57,
        detected ? 'rgba(224,150,92,0.95)' : 'rgba(255,255,255,0.6)',
        16 * S,
      );
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 05 · 정문 게이트', detected, 'ALERT', 'TRACKING');
    }
  },

  /**
   * 행사장 주변 화재 발생.
   * 야간 야외 부스 옆에서 불길이 자라고, 규모가 커지는 순간 포착된다.
   */
  venueFire(ctx, W, H, t, opts) {
    const S = scaleOf(H);
    const z = opts?.compact ? 1.25 : 1;

    // 야간 야외 — 하늘·부스 실루엣·바닥
    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#12161d';
    ctx.fillRect(0, 0, W, H * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, H * 0.495, W, 2 * S);
    // 부스(천막) 실루엣 줄 — 지붕이 삼각형이다
    ctx.fillStyle = '#161b23';
    for (let i = 0; i < 4; i++) {
      const bx = W * (0.08 + i * 0.24);
      const bw = W * 0.17;
      const by = H * 0.5;
      const bh = H * 0.16;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - bh * 0.6);
      ctx.lineTo(bx + bw / 2, by - bh);
      ctx.lineTo(bx + bw, by - bh * 0.6);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fill();
    }
    // 줄 조명 — 부스 사이에 걸린 점 전구
    ctx.fillStyle = 'rgba(220,210,170,0.35)';
    for (let i = 0; i < 14; i++) {
      const lx = W * (0.06 + i * 0.066);
      const ly = H * (0.36 + Math.sin(i * 1.1) * 0.012);
      ctx.beginPath();
      ctx.arc(lx, ly, 2.2 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = H * 0.54 + i * i * 10 * S + 14 * S;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy - 16 * S);
      ctx.stroke();
    }

    const DETECT = 0.4;
    const detected = t >= DETECT;
    const fx = W * 0.38;
    const fy = H * 0.72;
    // 불길 성장 — 초반에 자라고, 이후에는 숨쉬듯 흔들린다
    const grow = Math.min(1, t / 0.35);
    const size = H * 0.2 * z * (0.35 + 0.65 * grow) * (1 + Math.sin(t * Math.PI * 2 * 7) * 0.04);
    flame(ctx, fx, fy, size, t);

    // 대피하는 인원 — 불길 반대쪽으로 뛰어간다
    if (t > 0.5) {
      const k = (t - 0.5) / 0.5;
      walker(ctx, {
        x: fx + W * 0.12 + k * W * 0.34,
        y: H * 0.86,
        h: H * WALKER_H * z * 0.9,
        phase: t * Math.PI * 40,
        stride: 1.15,
        facing: 1,
        tone: 'normal',
      });
    }

    if (detected) {
      detectPulse(ctx, fx, fy - size * 0.5, size * 0.7, (t - DETECT) / 0.14, S * z);
      bbox(
        ctx,
        fx - size * 0.62,
        fy - size * 1.25,
        size * 1.24,
        size * 1.3,
        ALERT,
        'FIRE 0.97',
        S * z * 0.9,
      );
      ctx.fillStyle = 'rgba(212,118,60,0.08)';
      ctx.fillRect(0, 0, W, H);
    }

    cctvTexture(ctx, W, H, t);
    if (!opts?.compact) {
      cctvChrome(ctx, W, H, t, 'CAM 30 · 외곽 부스', detected, 'FIRE', 'MONITORING');
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

/* ── 카메라 광학 파이프라인 ──────────────────────────────────────────
   벡터 그림이 "그림" 으로 읽히는 첫 번째 이유는 픽셀까지 쨍한 윤곽선이다.
   실제 카메라 영상은 렌즈 소프트닝·센서 노이즈·압축이 그 선을 뭉갠다.
   장면을 오프스크린에 그린 뒤 이 파이프라인을 통과시켜 "촬영된 화면" 으로
   바꾼다. 도식 장면(디지털 트윈·침수 시뮬레이션)은 카메라가 아니므로 제외. */

const CAMERA_SCENES = new Set([
  'intrusion', 'loitering', 'zoneReentry', 'bagObject', 'concealedHand',
  'falldown', 'sittingFloor', 'peopleCounting', 'cameraGaze', 'venueFire',
  'intrusionRawA', 'intrusionRawB',
]);

/** 센서 그레인 — 매 프레임 다른 자리에 밝고 어두운 점을 흩뿌린다. */
function sensorGrain(ctx, W, H, t) {
  const S = scaleOf(H);
  const rand = (i) => {
    const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const seed = Math.floor(t * 150) * 97;
  for (let i = 0; i < 650; i++) {
    const a = 0.02 + 0.055 * rand(seed + i * 3.7);
    ctx.fillStyle = rand(seed + i * 1.3) > 0.5
      ? `rgba(255,255,255,${a.toFixed(3)})`
      : `rgba(0,0,0,${a.toFixed(3)})`;
    const sz = (0.9 + rand(seed + i * 2.1) * 1.7) * S;
    ctx.fillRect(rand(seed + i) * W, rand(seed + i * 7.7) * H, sz, sz);
  }
  // 간헐적 수평 노이즈 밴드 — 아날로그 전송 흔적
  if (rand(seed * 1.7) > 0.85) {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(0, rand(seed * 2.3) * H, W, 2.4 * S);
  }
}

function renderScene(name, ctx, W, H, t, opts) {
  const sceneFn = SCENES[name];
  if (!CAMERA_SCENES.has(name) || typeof document === 'undefined') {
    sceneFn(ctx, W, H, t, opts);
    return;
  }

  if (!renderScene._os) renderScene._os = document.createElement('canvas');
  const os = renderScene._os;
  const c = ctx.canvas;
  if (os.width !== c.width || os.height !== c.height) {
    os.width = c.width;
    os.height = c.height;
  }
  const octx = os.getContext('2d');
  octx.save();
  sceneFn(octx, W, H, t, opts);
  octx.restore();

  const S = scaleOf(H);

  // 1) 렌즈+노출 — 미세 블러가 벡터 윤곽을 죽이고, 올린 노출이 야간 CCTV 의
  //    "밝게 끌어올린 중간 회색" 을 만든다. 어두운 원장면을 그대로 두면
  //    실사가 아니라 그냥 어두운 그림으로 읽힌다.
  ctx.save();
  ctx.filter = `blur(${(0.55 * S).toFixed(2)}px) saturate(0.42) brightness(1.45) contrast(0.87)`;
  ctx.drawImage(os, 0, 0);
  ctx.restore();
  ctx.filter = 'none';

  // 2) 블랙 리프트 — 실제 카메라 영상에 순수한 검정은 없다
  ctx.fillStyle = 'rgba(152,162,174,0.10)';
  ctx.fillRect(0, 0, W, H);

  // 3) 하이라이트 블룸 — 조명·밝은 면이 번진다
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.15;
  ctx.filter = `blur(${(6 * S).toFixed(1)}px) brightness(1.3) saturate(0.7)`;
  ctx.drawImage(os, 0, 0);
  ctx.restore();
  ctx.filter = 'none';

  // 4) 센서 그레인
  sensorGrain(ctx, W, H, t);

  // 5) 노출 흔들림 — 자동 노출이 미세하게 출렁인다
  const flick = Math.sin(t * 47.1) * 0.5 + Math.sin(t * 89.3) * 0.5;
  ctx.fillStyle = flick > 0
    ? `rgba(255,255,255,${(0.012 * flick).toFixed(4)})`
    : `rgba(0,0,0,${(-0.015 * flick).toFixed(4)})`;
  ctx.fillRect(0, 0, W, H);
}

if (typeof window !== 'undefined') {
  window.SCENES = SCENES;
  window.renderScene = renderScene;
}
