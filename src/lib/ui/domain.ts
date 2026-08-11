import type { Accent } from '@/lib/domain/enums';

/**
 * 강조색 정의.
 *
 * Tailwind 는 소스를 정적으로 훑어 클래스명을 수집하므로 문자열을 조합해
 * 만들면 안 된다 (`text-[var(--color-accent-${x})]` 는 빌드에서 사라진다).
 * 그래서 완성된 문자열을 나열한다.
 *
 * 축은 관리자에서 만들지만 색은 이 목록에서 고른다. 축이 늘어도 여기는
 * 그대로이며, 새 색이 필요할 때만 이 파일과 globals.css 를 함께 늘린다.
 */
export const ACCENT_STYLES: Record<
  Accent,
  {
    text: string;
    bg: string;
    border: string;
    bar: string;
    dot: string;
    /** 어두운 배경 위에서 쓰는 변형 */
    textBright: string;
    dotBright: string;
  }
> = {
  blue: {
    text: 'text-[var(--color-accent-blue)]',
    bg: 'bg-[var(--color-accent-blue-soft)]',
    border: 'border-[var(--color-accent-blue)]',
    bar: 'bg-[var(--color-accent-blue)]',
    dot: 'bg-[var(--color-accent-blue)]',
    textBright: 'text-[var(--color-accent-blue-bright)]',
    dotBright: 'bg-[var(--color-accent-blue-bright)]',
  },
  teal: {
    text: 'text-[var(--color-accent-teal)]',
    bg: 'bg-[var(--color-accent-teal-soft)]',
    border: 'border-[var(--color-accent-teal)]',
    bar: 'bg-[var(--color-accent-teal)]',
    dot: 'bg-[var(--color-accent-teal)]',
    textBright: 'text-[var(--color-accent-teal-bright)]',
    dotBright: 'bg-[var(--color-accent-teal-bright)]',
  },
  bronze: {
    text: 'text-[var(--color-accent-bronze)]',
    bg: 'bg-[var(--color-accent-bronze-soft)]',
    border: 'border-[var(--color-accent-bronze)]',
    bar: 'bg-[var(--color-accent-bronze)]',
    dot: 'bg-[var(--color-accent-bronze)]',
    textBright: 'text-[var(--color-accent-bronze-bright)]',
    dotBright: 'bg-[var(--color-accent-bronze-bright)]',
  },
  plum: {
    text: 'text-[var(--color-accent-plum)]',
    bg: 'bg-[var(--color-accent-plum-soft)]',
    border: 'border-[var(--color-accent-plum)]',
    bar: 'bg-[var(--color-accent-plum)]',
    dot: 'bg-[var(--color-accent-plum)]',
    textBright: 'text-[var(--color-accent-plum-bright)]',
    dotBright: 'bg-[var(--color-accent-plum-bright)]',
  },
  slate: {
    text: 'text-[var(--color-accent-slate)]',
    bg: 'bg-[var(--color-accent-slate-soft)]',
    border: 'border-[var(--color-accent-slate)]',
    bar: 'bg-[var(--color-accent-slate)]',
    dot: 'bg-[var(--color-accent-slate)]',
    textBright: 'text-[var(--color-accent-slate-bright)]',
    dotBright: 'bg-[var(--color-accent-slate-bright)]',
  },
  navy: {
    text: 'text-[var(--color-accent-navy)]',
    bg: 'bg-[var(--color-accent-navy-soft)]',
    border: 'border-[var(--color-accent-navy)]',
    bar: 'bg-[var(--color-accent-navy)]',
    dot: 'bg-[var(--color-accent-navy)]',
    textBright: 'text-[var(--color-accent-navy-bright)]',
    dotBright: 'bg-[var(--color-accent-navy-bright)]',
  },
  sky: {
    text: 'text-[var(--color-accent-sky)]',
    bg: 'bg-[var(--color-accent-sky-soft)]',
    border: 'border-[var(--color-accent-sky)]',
    bar: 'bg-[var(--color-accent-sky)]',
    dot: 'bg-[var(--color-accent-sky)]',
    textBright: 'text-[var(--color-accent-sky-bright)]',
    dotBright: 'bg-[var(--color-accent-sky-bright)]',
  },
  green: {
    text: 'text-[var(--color-accent-green)]',
    bg: 'bg-[var(--color-accent-green-soft)]',
    border: 'border-[var(--color-accent-green)]',
    bar: 'bg-[var(--color-accent-green)]',
    dot: 'bg-[var(--color-accent-green)]',
    textBright: 'text-[var(--color-accent-green-bright)]',
    dotBright: 'bg-[var(--color-accent-green-bright)]',
  },
  wine: {
    text: 'text-[var(--color-accent-wine)]',
    bg: 'bg-[var(--color-accent-wine-soft)]',
    border: 'border-[var(--color-accent-wine)]',
    bar: 'bg-[var(--color-accent-wine)]',
    dot: 'bg-[var(--color-accent-wine)]',
    textBright: 'text-[var(--color-accent-wine-bright)]',
    dotBright: 'bg-[var(--color-accent-wine-bright)]',
  },
  indigo: {
    text: 'text-[var(--color-accent-indigo)]',
    bg: 'bg-[var(--color-accent-indigo-soft)]',
    border: 'border-[var(--color-accent-indigo)]',
    bar: 'bg-[var(--color-accent-indigo)]',
    dot: 'bg-[var(--color-accent-indigo)]',
    textBright: 'text-[var(--color-accent-indigo-bright)]',
    dotBright: 'bg-[var(--color-accent-indigo-bright)]',
  },
};

/**
 * 축이 삭제됐거나 색 값이 깨진 경우의 기본값.
 * 화면이 비거나 클래스가 undefined 로 새어 나가는 것을 막는다.
 */
export const FALLBACK_ACCENT: Accent = 'slate';

export function accentStyle(accent: string | undefined) {
  return ACCENT_STYLES[(accent as Accent) in ACCENT_STYLES ? (accent as Accent) : FALLBACK_ACCENT];
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
