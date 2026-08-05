import Link from 'next/link';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { evaluateMetric, formatNumber, pickHeadlineMetric } from '@/lib/domain/metric';
import { DOMAIN_SHORT_LABELS } from '@/lib/domain/enums';
import type { PublicTech } from '@/lib/domain/types';
import { DOMAIN_STYLES, cn } from '@/lib/ui/domain';

/** 썸네일이 없는 기술의 대체 화면. 억지 이미지 대신 대표 수치를 크게 세운다. */
function MetricPanel({ tech }: { tech: PublicTech }) {
  const headline = pickHeadlineMetric(
    tech.metrics,
    tech.demo.type === 'metric' ? tech.demo.highlight_metric : undefined,
  );
  const style = DOMAIN_STYLES[tech.domain];

  if (!headline) {
    // 썸네일도 지표도 없는 기술 — 대분류만 담백하게 표시한다.
    return (
      <div className={cn('flex h-full items-center justify-center', style.bg)}>
        <span className={cn('text-sm font-medium', style.text)}>
          {DOMAIN_SHORT_LABELS[tech.domain]}
        </span>
      </div>
    );
  }

  const { targetText } = evaluateMetric(headline);

  return (
    <div className={cn('flex h-full flex-col justify-center px-5', style.bg)}>
      <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">
        {headline.label}
      </div>
      <div className={cn('numeric mt-1 text-4xl font-semibold', style.text)}>
        {formatNumber(headline.value)}
      </div>
      <div className="mt-1 text-xs text-ink-500">목표 {targetText}</div>
      {headline.condition?.trim() ? (
        <div className="mt-0.5 text-xs text-ink-400">{headline.condition}</div>
      ) : null}
    </div>
  );
}

function Thumbnail({ tech }: { tech: PublicTech }) {
  // 영상 루프가 있으면 우선한다. 자동재생은 무음·인라인이어야 모바일에서 동작한다.
  if (tech.media.loop) {
    return (
      <video
        className="h-full w-full object-cover"
        src={tech.media.loop}
        poster={tech.media.thumbnail}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />
    );
  }

  if (tech.media.thumbnail) {
    return (
      // 썸네일은 로컬 SVG·이미지이며 LCP 대상이 아니므로 최적화 파이프라인을 태우지 않는다.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="h-full w-full object-cover"
        src={tech.media.thumbnail}
        alt=""
        loading="lazy"
      />
    );
  }

  return <MetricPanel tech={tech} />;
}

export function TechCard({ tech }: { tech: PublicTech }) {
  const style = DOMAIN_STYLES[tech.domain];
  const headline = pickHeadlineMetric(
    tech.metrics,
    tech.demo.type === 'metric' ? tech.demo.highlight_metric : undefined,
  );
  const headlineEval = headline ? evaluateMetric(headline) : null;
  const industries = tech.business.target_industries?.length
    ? tech.business.target_industries
    : tech.industries;

  return (
    <Link
      href={`/tech/${tech.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink-200 bg-white transition-colors hover:border-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-700"
    >
      <div className="relative aspect-video shrink-0 overflow-hidden bg-ink-100">
        <Thumbnail tech={tech} />
        <span
          className={cn(
            'absolute top-0 left-0 px-2 py-1 text-xs font-medium text-white',
            style.bar,
          )}
        >
          {DOMAIN_SHORT_LABELS[tech.domain]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900 group-hover:underline">
            {tech.name_ko}
          </h3>
          <p className="line-clamp-1 mt-1 text-sm text-ink-500">
            {tech.business.problem ?? tech.summary}
          </p>
        </div>

        {headline && headlineEval ? (
          <div className="flex items-baseline gap-2 border-t border-ink-100 pt-3">
            <span className="text-xs text-ink-500">{headline.label}</span>
            <span className="numeric text-xl font-semibold text-ink-900">
              {formatNumber(headline.value)}
            </span>
            <span className="text-xs text-ink-400">목표 {headlineEval.targetText}</span>
          </div>
        ) : (
          <div className="border-t border-ink-100 pt-3 text-xs text-ink-400">
            정량 지표 없음 · 데모로 확인
          </div>
        )}

        {headline?.condition?.trim() ? (
          <div className="-mt-2 text-xs text-ink-400">{headline.condition}</div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <VerificationBadge level={tech.verification.level} body={tech.verification.body} />
          <DemoTypeBadge type={tech.demo.type} />
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {industries.slice(0, 3).map((industry) => (
            <span key={industry} className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600">
              {industry}
            </span>
          ))}
          {industries.length > 3 ? (
            <span className="px-1 py-0.5 text-xs text-ink-400">+{industries.length - 3}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
