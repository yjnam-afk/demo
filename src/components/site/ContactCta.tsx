import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * 문의 전환 지점.
 * 헤더와 상세 화면의 "도입 문의"가 이 구간(#contact)으로 모인다.
 */
export function ContactCta() {
  return (
    <section id="contact" className="grid-backdrop scroll-mt-24 bg-ink-950">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          도입을 검토 중이시라면
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-300">
          현장 조건을 알려주시면 어떤 기술이 맞을지 정리해 보내드리겠습니다.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${BRAND.contact.email}?subject=${encodeURIComponent('[도입 문의]')}`}
            className="rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.email}
          </a>
          <Link
            href="/tech"
            className="rounded border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/60"
          >
            기술 먼저 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
