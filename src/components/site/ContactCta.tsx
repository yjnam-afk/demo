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
          적용 가능성을 함께 검토해 드립니다
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-300">
          현장 조건을 알려주시면 적용 가능한 기술과 도입 조건을 정리해 회신드립니다.
        </p>

        {/*
          버튼은 문의 하나다. 카탈로그로 돌려보내는 보조 버튼은 문의까지 온
          방문자를 되돌리는 문이었다. 메일 주소는 버튼 옆에 글자로 남긴다 —
          메일 클라이언트가 안 열리는 환경에서는 주소를 복사해야 한다.
        */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${BRAND.contact.email}?subject=${encodeURIComponent('[도입 문의]')}`}
            className="rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            {BRAND.contact.label}
          </a>
          <span className="numeric text-sm text-ink-400">{BRAND.contact.email}</span>
        </div>
      </div>
    </section>
  );
}
