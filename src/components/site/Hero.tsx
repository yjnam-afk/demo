import Link from 'next/link';
import { VideoSources } from '@/components/ui/Video';
import { BRAND } from '@/lib/brand';
import { evaluateMetric, formatNumber, pickHeadlineMetric } from '@/lib/domain/metric';
import { DOMAIN_SHORT_LABELS } from '@/lib/domain/enums';
import type { PublicTech } from '@/lib/domain/types';
import { DOMAIN_STYLES, cn } from '@/lib/ui/domain';

/**
 * 히어로.
 *
 * 대표 데모 한 개가 배경에서 자동 재생되고 설명 텍스트는 최소한으로 둔다.
 * 어떤 기술이 대표가 될지는 데이터가 정한다 — 관리자가 순서를 바꾸면 히어로도
 * 따라 바뀌므로, 특정 기술 id 를 코드에 박지 않는다.
 *
 * 영상이 없으면 배경 없이 문구만으로 성립한다. 히어로를 위해 억지 이미지를
 * 넣지 않는다.
 */
export function Hero({ tech }: { tech: PublicTech | null }) {
  const headline = tech ? pickHeadlineMetric(tech.metrics as never) : null;
  const headlineEval = headline ? evaluateMetric(headline) : null;
  const style = tech ? DOMAIN_STYLES[tech.domain] : null;

  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      {tech?.media.video ? (
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
          poster={tech.media.thumbnail}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        >
          <VideoSources mp4={tech.media.video} webm={tech.media.video_webm} />
        </video>
      ) : null}

      {/* 영상 위 글자 가독성 확보. 아래쪽을 더 어둡게 눌러 지표 줄이 묻히지 않게 한다. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/85 via-ink-950/70 to-ink-950" />
      <div className="grid-backdrop absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <p className="text-sm font-medium tracking-wide text-[var(--color-brand-bright)]">
          {BRAND.slogan}
        </p>
        <h1 className="headline mt-5 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
          {BRAND.headline}
        </h1>
        {/*
          태그라인 대신 본문을 쓴다. 히어로 배경이 영상 데모 하나라 그대로 두면
          영상 분석 회사로만 읽히므로, 다루는 데이터 종류를 여기서 밝힌다.
        */}
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-300">{BRAND.intro}</p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/tech"
            className="rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
          >
            기술 카탈로그 보기
          </Link>
          <a
            href="#contact"
            className="rounded border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/60"
          >
            {BRAND.contact.label}
          </a>
        </div>

        {/* 재생 중인 데모가 무엇인지 밝힌다. 출처 없는 영상은 신뢰를 깎는다. */}
        {tech ? (
          <Link
            href={`/tech/${tech.id}`}
            className="mt-16 inline-flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-6 text-sm text-ink-300 hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', style?.dotBright)} />
              {DOMAIN_SHORT_LABELS[tech.domain]}
            </span>
            <span className="font-medium text-white">{tech.name_ko}</span>
            {headline && headlineEval ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-ink-400">{headline.label}</span>
                <span className="numeric font-semibold text-white">
                  {formatNumber(headline.value)}
                </span>
                <span className="text-ink-400">목표 {headlineEval.targetText}</span>
                {headline.condition?.trim() ? (
                  <span className="text-ink-500">· {headline.condition}</span>
                ) : null}
              </span>
            ) : null}
            <span className="text-ink-400">데모 보기 →</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
