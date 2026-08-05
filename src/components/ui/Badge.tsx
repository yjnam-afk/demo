import {
  DEMO_TYPE_LABELS,
  VERIFICATION_LABELS,
  type DemoType,
  type VerificationLevel,
} from '@/lib/domain/enums';

/**
 * 배지는 검증 등급과 데모 유형 두 종류뿐이다.
 * 범용 Badge 를 두지 않는 것은 의도적이다 — 배지가 늘어나면 카드에서
 * 성능 수치가 묻히기 때문에, 새 배지를 만들려면 이 파일을 고쳐야 하도록 막아 둔다.
 */

const VERIFICATION_STYLES: Record<VerificationLevel, string> = {
  third_party:
    'bg-[var(--color-signal-ok-soft)] text-[var(--color-signal-ok)] border-[var(--color-signal-ok)]/25',
  self_test: 'bg-ink-100 text-ink-600 border-ink-300',
  in_development:
    'bg-[var(--color-signal-warn-soft)] text-[var(--color-signal-warn)] border-[var(--color-signal-warn)]/25',
};

/** 어두운 배경(카드 썸네일 위) 전용 변형 */
const VERIFICATION_STYLES_DARK: Record<VerificationLevel, string> = {
  third_party: 'bg-white/10 text-[var(--color-signal-ok-bright)] border-white/20',
  self_test: 'bg-white/10 text-white/80 border-white/20',
  in_development: 'bg-white/10 text-white/70 border-white/20',
};

export function VerificationBadge({
  level,
  body,
  onDark = false,
}: {
  level: VerificationLevel;
  body?: string;
  onDark?: boolean;
}) {
  // 인증 기관이 있으면 함께 노출한다 ("제3자 인증"만으로는 신뢰 근거가 약하다)
  const label = level === 'third_party' && body ? `${body} 인증` : VERIFICATION_LABELS[level];
  const styles = onDark ? VERIFICATION_STYLES_DARK[level] : VERIFICATION_STYLES[level];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export function DemoTypeBadge({ type, onDark = false }: { type: DemoType; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs font-medium ${
        onDark
          ? 'border-white/20 bg-white/10 text-white/80'
          : 'border-ink-300 bg-white text-ink-600'
      }`}
    >
      {DEMO_TYPE_LABELS[type]}
    </span>
  );
}
