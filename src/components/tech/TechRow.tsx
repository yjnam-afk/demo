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
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
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
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
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
        {/*
          분류는 한 덩어리다 — 대분류와 카테고리를 떼어 놓고 카테고리를
          회색 잔글씨로 두면 방문자가 목록을 훑을 때 읽지 않는다. 이 사이트의
          목록은 분류로 찾는 화면이므로, 둘을 축 색 칩 하나로 묶어 세운다.
        */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-medium',
              style.text,
              style.bg,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {tech.domain_short}
            <span className="opacity-40">·</span>
            {tech.category}
          </span>
          <DemoTypeBadge type={tech.demo.type} />
          <VerificationBadge level={tech.verification.level} body={tech.verification.body} />
        </div>

        <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink-900 group-hover:underline">
          {tech.name_ko}
        </h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600">
          {tech.business.problem ?? tech.summary}
        </p>

        {/* 산업군 — 분류(축·카테고리)와 성격이 달라 문제 문장 뒤에 둔다.
            "어디에 쓰나" 이므로 이름표를 달아 무엇의 목록인지 밝힌다. */}
        {tech.industries.length > 0 ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-500">
            <span className="text-ink-400">적용</span>
            {tech.industries.map((industry) => (
              <span key={industry} className="rounded bg-ink-100 px-1.5 py-0.5 text-ink-600">
                {industry}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      {/* 수치 기둥 — 오른쪽 정렬 고정 폭. 목록을 훑으면 숫자가 한 줄로 선다 */}
      <div className="sm:text-right">
        {headline && evaluated ? (
          <>
            <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">
              {headline.label}
            </div>
            {/* 목록 수치는 움직이지 않는다 — 행마다 차오르면 훑는 화면이 어수선해진다 */}
            <div className="mt-0.5 numeric text-3xl font-semibold text-ink-900">
              {formatNumber(headline.value)}
            </div>
            {/*
              목표는 수치 아래 한 줄로 내린다 — 옆에 붙이면 좁은 기둥에서
              "정량 목표 17.6 / 이하" 처럼 잘려 두 줄이 된다.
              목표가 없는 지표(인증 성적서 측정값)는 이 줄이 없다.
            */}
            {evaluated.targetText ? (
              <div className="mt-0.5 text-xs whitespace-nowrap text-ink-500">
                정량 목표 {evaluated.targetText}
              </div>
            ) : null}
            {/*
              조건 단서는 목록에 싣지 않는다. 훑는 자리에 시험 조건을 다
              늘어놓으면 소음이 되고, 전체 조건은 클릭 한 번 안쪽 상세
              지표 판이 값 옆에 그대로 보여 준다.
            */}
          </>
        ) : (
          <div className="text-xs leading-relaxed text-ink-400 sm:pt-3">
            정량 지표 없음
            {/* 데모 없는 기술에 "데모로 확인" 은 거짓 안내가 된다 */}
            {tech.demo.type !== 'none' ? (
              <>
                <br />
                데모로 확인
              </>
            ) : null}
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
