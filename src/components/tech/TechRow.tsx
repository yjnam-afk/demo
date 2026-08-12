import Link from 'next/link';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { evaluateMetric, formatNumber, pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicTech } from '@/lib/domain/types';
import { accentStyle, cn } from '@/lib/ui/domain';

/**
 * 기술 목록 행.
 *
 * 카드 격자를 대체한다. 카드는 높이를 맞추려고 문제 문장을 두 줄에서 잘랐는데,
 * 그 문장이 이 사이트에서 가장 공들인 글이다. 행은 전체 폭을 쓰므로 자르지
 * 않는다.
 *
 * 구성: [비주얼] [문제 전문 + 이름] [대표 수치]
 * 수치 기둥은 고정 폭 오른쪽 정렬이라, 목록을 아래로 훑으면 숫자들이 한 줄로
 * 선다 — 카드에서 수치가 하던 역할을 행에서도 잃지 않는다.
 */
export function TechRow({ tech }: { tech: PublicTech }) {
  const style = accentStyle(tech.domain_accent);
  const headline = pickHeadlineMetric(
    tech.metrics as never,
    tech.demo.type === 'metric' ? tech.demo.highlight_metric : undefined,
  );
  const evaluated = headline ? evaluateMetric(headline as never) : null;
  const hasVisual = Boolean(tech.media.loop ?? tech.media.thumbnail);

  return (
    <Link
      href={`/tech/${tech.id}`}
      className="group grid grid-cols-1 items-start gap-x-6 gap-y-3 border-t border-ink-200 py-6 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_11rem] lg:grid-cols-[13rem_minmax(0,1fr)_11rem]"
    >
      {/*
        비주얼. 넓은 화면에서는 왼쪽 열, 좁은 화면에서는 행 상단 전체 폭이다 —
        모바일에서 숨기면 루프 영상과 썸네일이 통째로 사라진다. 미디어가 없는
        기술은 좁은 화면에서 생략하고, 넓은 화면에서만 축 색 판으로 자리를
        지켜 행 시작선을 맞춘다.
      */}
      <div className={hasVisual ? 'block' : 'hidden lg:block'}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-ink-200 bg-ink-950">
          {tech.media.loop ? (
            <LoopVideo
              className="h-full w-full object-cover"
              mp4={tech.media.loop}
              webm={tech.media.loop_webm}
              poster={tech.media.loop_poster ?? tech.media.thumbnail}
            />
          ) : tech.media.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tech.media.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className={cn('h-2 w-2 rounded-full', style.dotBright)} />
            </div>
          )}
          {!hasVisual ? null : null}
        </div>
      </div>

      {/* 본문 — 문제 문장은 자르지 않는다 */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={cn('flex items-center gap-1.5 font-medium', style.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {tech.domain_short}
          </span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500">{tech.category}</span>
          <DemoTypeBadge type={tech.demo.type} />
          <VerificationBadge level={tech.verification.level} body={tech.verification.body} />
        </div>

        <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink-900 group-hover:underline">
          {tech.name_ko}
        </h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600">
          {tech.business.problem ?? tech.summary}
        </p>

        {tech.industries.length > 0 ? (
          <p className="mt-2.5 text-xs text-ink-500">{tech.industries.join(' · ')}</p>
        ) : null}
      </div>

      {/* 수치 기둥 — 오른쪽 정렬 고정 폭. 목록을 훑으면 숫자가 한 줄로 선다 */}
      <div className="sm:text-right">
        {headline && evaluated ? (
          <>
            <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">
              {headline.label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5 sm:justify-end">
              <span className="numeric text-3xl font-semibold text-ink-900">
                {formatNumber(headline.value)}
              </span>
              {/* 목표가 없는 지표(인증 성적서 측정값)는 목표 문구를 생략한다 */}
              {evaluated.targetText ? (
                <span className="text-xs text-ink-500">목표 {evaluated.targetText}</span>
              ) : null}
            </div>
            {/* 조건 단서 — 값과 떨어지지 않는다. 좁은 기둥이라 한 줄로 잇는다 */}
            {headline.conditions.length > 0 ? (
              <div className="mt-0.5 text-xs text-ink-400">
                {headline.conditions.join(' · ')}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-xs leading-relaxed text-ink-400 sm:pt-3">
            정량 지표 없음
            <br />
            데모로 확인
          </div>
        )}
      </div>
    </Link>
  );
}

/** 행 목록 래퍼 — 페이지마다 같은 리듬을 쓰게 한 곳에 둔다. */
export function TechRowList({ techs }: { techs: PublicTech[] }) {
  return (
    <div className="flex flex-col">
      {techs.map((tech) => (
        <TechRow key={tech.id} tech={tech} />
      ))}
    </div>
  );
}
