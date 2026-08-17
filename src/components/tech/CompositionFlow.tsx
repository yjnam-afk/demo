import Link from 'next/link';
import { VerificationBadge } from '@/components/ui/Badge';
import { evaluateMetric, formatNumber, pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicTech } from '@/lib/domain/types';
import { accentStyle, cn } from '@/lib/ui/domain';

/**
 * 제품의 구성 흐름.
 *
 * 제품별 보기에서 기술 카드를 격자로 늘어놓으면 기술별 보기와 같은 화면이
 * 되고, 보기를 바꾼 이유가 사라진다. 제품에서 알고 싶은 것은 개별 기술의
 * 성능이 아니라 "무엇이 어떤 순서로 맞물려 하나가 되는가" 다.
 *
 * 그래서 순서를 번호로 세우고, 역할 설명을 앞에 둔다. 기술명과 대표 수치는
 * 뒤에 붙는 근거로만 둔다 — 자세한 성능은 기술별 보기와 상세가 맡는다.
 */
export function CompositionFlow({
  steps,
}: {
  steps: { role: string; tech: PublicTech }[];
}) {
  /* 단계가 하나면 번호를 붙이지 않는다. 매길 순서가 없는데 "1" 만 남는다. */
  const ordered = steps.length > 1;

  return (
    <ol className="mt-6 flex flex-col">
      {steps.map(({ role, tech }, index) => {
        const style = accentStyle(tech.domain_accent);
        const headline = pickHeadlineMetric(tech.metrics as never);
        const evaluated = headline ? evaluateMetric(headline) : null;
        const last = index === steps.length - 1;

        return (
          <li key={tech.id} className="flex gap-4">
            {/* 번호와 세로선이 순서를 만든다. 마지막 단계는 선을 끊는다. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full',
                  style.bar,
                  ordered
                    ? 'numeric h-7 w-7 text-xs font-semibold text-ink-50'
                    : 'mt-2 h-2.5 w-2.5',
                )}
              >
                {ordered ? index + 1 : null}
              </span>
              {!last ? <span className="w-px flex-1 bg-ink-200" /> : null}
            </div>

            <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-6')}>
              {/* 역할이 먼저다 — 이 단계가 무엇을 맡는지가 이 화면의 내용이다 */}
              <p className="leading-relaxed text-ink-900">{role}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <Link
                  href={`/tech/${tech.id}`}
                  className="font-medium text-ink-700 underline underline-offset-4 hover:text-ink-900"
                >
                  {tech.name_ko}
                </Link>
                <span className="flex items-center gap-1.5 text-ink-500">
                  <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                  {tech.domain_short}
                </span>

                {headline && evaluated ? (
                  <span className="flex items-baseline gap-1.5 text-ink-500">
                    <span>{headline.label}</span>
                    <span className="numeric font-semibold text-ink-900">
                      {formatNumber(headline.value)}
                    </span>
                    {/* 조건 단서는 구성 흐름에 싣지 않는다 — 상세 지표 판이 보여 준다 */}
                  </span>
                ) : null}

                <VerificationBadge
                  level={tech.verification.level}
                  body={tech.verification.body}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
