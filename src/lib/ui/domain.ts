import type { Domain } from '@/lib/domain/enums';

/**
 * 3축 구분색의 단일 정의.
 * Tailwind 는 문자열을 정적으로 스캔하므로 클래스명을 조합해 만들지 않고
 * 완성된 문자열을 나열한다.
 */
export const DOMAIN_STYLES: Record<
  Domain,
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
  ai: {
    text: 'text-[var(--color-domain-ai)]',
    bg: 'bg-[var(--color-domain-ai-soft)]',
    border: 'border-[var(--color-domain-ai)]',
    bar: 'bg-[var(--color-domain-ai)]',
    dot: 'bg-[var(--color-domain-ai)]',
    textBright: 'text-[var(--color-domain-ai-bright)]',
    dotBright: 'bg-[var(--color-domain-ai-bright)]',
  },
  digital_twin: {
    text: 'text-[var(--color-domain-twin)]',
    bg: 'bg-[var(--color-domain-twin-soft)]',
    border: 'border-[var(--color-domain-twin)]',
    bar: 'bg-[var(--color-domain-twin)]',
    dot: 'bg-[var(--color-domain-twin)]',
    textBright: 'text-[var(--color-domain-twin-bright)]',
    dotBright: 'bg-[var(--color-domain-twin-bright)]',
  },
  spatial: {
    text: 'text-[var(--color-domain-spatial)]',
    bg: 'bg-[var(--color-domain-spatial-soft)]',
    border: 'border-[var(--color-domain-spatial)]',
    bar: 'bg-[var(--color-domain-spatial)]',
    dot: 'bg-[var(--color-domain-spatial)]',
    textBright: 'text-[var(--color-domain-spatial-bright)]',
    dotBright: 'bg-[var(--color-domain-spatial-bright)]',
  },
};

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
