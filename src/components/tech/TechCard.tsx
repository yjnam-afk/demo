import Link from 'next/link';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { evaluateMetric, formatNumber, pickHeadlineMetric } from '@/lib/domain/metric';
import { DOMAIN_SHORT_LABELS } from '@/lib/domain/enums';
import type { PublicMetric, PublicTech } from '@/lib/domain/types';
import { DOMAIN_STYLES, cn } from '@/lib/ui/domain';

/**
 * 대표 수치 표시.
 *
 * 카드의 시각 슬롯은 언제나 대표 수치가 차지한다. 썸네일이 있으면 그 위에 얹고,
 * 없으면 단독으로 세운다. 규칙을 하나로 두면 썸네일 유무와 무관하게
 * 카드를 훑을 때 숫자가 같은 위치에서 읽힌다 — 썸네일보다 숫자가 주인공이다.
 */
function HeadlineMetric({
  metric,
  onImage,
}: {
  metric: PublicMetric;
  /** 이미지 위에 얹는 경우 밝은 색으로 뒤집는다 */
  onImage: boolean;
}) {
  const { achieved, targetText } = evaluateMetric(metric);

  return (
    <div>
      <div
        className={cn(
          'text-xs font-medium tracking-wide uppercase',
          onImage ? 'text-white/70' : 'text-ink-500',
        )}
      >
        {metric.label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span
          className={cn(
            'numeric text-4xl font-semibold',
            onImage ? 'text-white' : 'text-ink-900',
          )}
        >
          {formatNumber(metric.value)}
        </span>
        <span className={cn('text-xs', onImage ? 'text-white/70' : 'text-ink-500')}>
          목표 {targetText}
        </span>
        {achieved ? (
          <span
            className={cn(
              'text-xs font-medium',
              onImage ? 'text-[var(--color-signal-ok-bright)]' : 'text-[var(--color-signal-ok)]',
            )}
          >
            달성
          </span>
        ) : null}
      </div>
      {/* 조건 단서는 값과 한 덩어리로만 존재한다. 떼어내면 과장 광고가 된다. */}
      {metric.condition?.trim() ? (
        <div className={cn('mt-1 text-xs', onImage ? 'text-white/60' : 'text-ink-400')}>
          {metric.condition}
        </div>
      ) : null}
    </div>
  );
}

export function TechCard({ tech }: { tech: PublicTech }) {
  const style = DOMAIN_STYLES[tech.domain];
  const headline = pickHeadlineMetric(
    tech.metrics as never,
    tech.demo.type === 'metric' ? tech.demo.highlight_metric : undefined,
  );
  const industries = tech.business.target_industries?.length
    ? tech.business.target_industries
    : tech.industries;

  const hasVisual = Boolean(tech.media.loop ?? tech.media.thumbnail);

  return (
    <Link
      href={`/tech/${tech.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink-200 bg-white transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-lg hover:shadow-ink-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-700"
    >
      {/* 시각 슬롯 — 썸네일 유무와 무관하게 항상 대표 수치를 담는다 */}
      <div
        className={cn(
          'relative flex aspect-[16/10] shrink-0 flex-col p-4',
          // 썸네일이 있으면 수치를 아래로 깔고, 없으면 빈 공간이 생기지 않게 가운데 세운다.
          hasVisual ? 'justify-between bg-ink-950' : 'justify-between bg-ink-50',
        )}
      >
        {tech.media.loop ? (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            src={tech.media.loop}
            poster={tech.media.thumbnail}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
          />
        ) : tech.media.thumbnail ? (
          // 로컬 자산이고 LCP 대상이 아니므로 최적화 파이프라인을 태우지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
            src={tech.media.thumbnail}
            alt=""
            loading="lazy"
          />
        ) : null}

        {/* 이미지 위 가독성 확보 — 아래쪽 수치가 배경에 묻히지 않게 한다 */}
        {hasVisual ? (
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20" />
        ) : null}

        <div className="relative flex items-start justify-between gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              hasVisual ? 'text-white/80' : style.text,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', hasVisual ? style.dotBright : style.dot)} />
            {DOMAIN_SHORT_LABELS[tech.domain]}
          </span>
          <VerificationBadge
            level={tech.verification.level}
            body={tech.verification.body}
            onDark={hasVisual}
          />
        </div>

        <div className={cn('relative', !hasVisual && 'flex flex-1 items-center')}>
          {headline ? (
            <HeadlineMetric metric={headline} onImage={hasVisual} />
          ) : (
            <span className={cn('text-sm', hasVisual ? 'text-white/70' : 'text-ink-500')}>
              정량 지표 없음 · 데모로 확인
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900 group-hover:underline">
            {tech.name_ko}
          </h3>
          {/* 카드에서 읽히는 문장은 기술 설명이 아니라 고객의 문제다 */}
          <p className="line-clamp-2 mt-1.5 text-sm leading-relaxed text-ink-600">
            {tech.business.problem ?? tech.summary}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
          <DemoTypeBadge type={tech.demo.type} />
          {industries.slice(0, 2).map((industry) => (
            <span key={industry} className="text-xs text-ink-500">
              {industry}
            </span>
          ))}
          {industries.length > 2 ? (
            <span className="text-xs text-ink-400">+{industries.length - 2}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
