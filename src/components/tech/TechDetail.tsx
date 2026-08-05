import Link from 'next/link';
import { DemoSlot } from '@/components/demo/DemoSlot';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { MetricTable } from './MetricDisplay';
import {
  DEV_TYPE_LABELS,
  DOMAIN_LABELS,
  MATURITY_LABELS,
  type Maturity,
} from '@/lib/domain/enums';
import type { PublicTech } from '@/lib/domain/types';
import { DOMAIN_STYLES, cn } from '@/lib/ui/domain';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-200 pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DefinitionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-100 py-3 sm:flex-row sm:gap-6">
      <dt className="w-40 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="text-sm text-ink-900">{children}</dd>
    </div>
  );
}

/**
 * 모든 기술이 공유하는 단일 상세 템플릿.
 *
 * 블록 순서가 요구사항이다. 방문자는 사업 의사결정자이므로
 * "이게 내 문제를 푸는가"(문제·대상 산업)를 먼저 보고,
 * 그 다음에 "믿을 만한가"(데모·지표)를 본다. 지표를 위로 올리지 않는다.
 *
 * 기술별 커스텀 레이아웃은 두지 않는다. 데이터가 없는 블록은 통째로 생략되며,
 * 그래도 나머지 블록만으로 화면이 자연스럽게 성립하도록 구성했다.
 */
export function TechDetail({
  tech,
  related,
}: {
  tech: PublicTech;
  /** 함께 쓰는 기술 — 외부 공개 대상만 넘어온다. */
  related: PublicTech[];
}) {
  const style = DOMAIN_STYLES[tech.domain];
  const business = tech.business;
  const industries = business.target_industries?.length
    ? business.target_industries
    : tech.industries;

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      {/* 1. 헤더 */}
      <header className="pb-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-medium',
              style.bg,
              style.text,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {DOMAIN_LABELS[tech.domain]}
          </span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-600">{tech.category}</span>
          {tech.team ? (
            <>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500">{tech.team}</span>
            </>
          ) : null}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">{tech.name_ko}</h1>
        {tech.name_en ? <p className="mt-1 text-sm text-ink-400">{tech.name_en}</p> : null}
        <p className="mt-3 text-base text-ink-600">{tech.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <VerificationBadge level={tech.verification.level} body={tech.verification.body} />
          <DemoTypeBadge type={tech.demo.type} />
          {business.maturity ? (
            <span className="text-sm text-ink-500">
              성숙도 · {MATURITY_LABELS[business.maturity as Maturity]}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {/* 2. 해결하는 문제 / 적용 대상 산업 — 지표보다 먼저 온다 */}
        <section className={cn('rounded-lg border-l-4 bg-white p-5', style.border)}>
          <h2 className="text-xs font-medium tracking-wide text-ink-400 uppercase">
            해결하는 문제
          </h2>
          <p className="mt-2 text-lg leading-relaxed text-ink-900">
            {business.problem ?? tech.summary}
          </p>

          {industries.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
              <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                적용 대상 산업
              </span>
              {industries.map((industry) => (
                <span
                  key={industry}
                  className="rounded bg-ink-100 px-2 py-0.5 text-sm text-ink-700"
                >
                  {industry}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* 3. 데모 슬롯 */}
        <Section title="데모">
          <DemoSlot tech={tech} />
        </Section>

        {/* 4. 성능 지표 — 지표가 없는 기술은 블록 자체를 생략한다 */}
        {tech.metrics.length > 0 ? (
          <Section
            title="성능 지표"
            description="각 지표는 명시된 평가 데이터셋과 조건에서 측정한 결과입니다."
          >
            <MetricTable metrics={tech.metrics} />
          </Section>
        ) : null}

        {/* 5. 도입 정보 */}
        {business.io?.input || business.io?.output || business.requirements?.length ? (
          <Section title="도입 정보">
            <dl>
              {business.io?.input ? (
                <DefinitionRow label="입력 형식">{business.io.input}</DefinitionRow>
              ) : null}
              {business.io?.output ? (
                <DefinitionRow label="출력 형식">{business.io.output}</DefinitionRow>
              ) : null}
              {business.requirements?.length ? (
                <DefinitionRow label="도입 조건 및 제약">
                  <ul className="flex flex-col gap-1">
                    {business.requirements.map((requirement) => (
                      <li key={requirement} className="flex gap-2">
                        <span className="text-ink-300">·</span>
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </DefinitionRow>
              ) : null}
            </dl>
          </Section>
        ) : null}

        {/* 6. 기술 구성 */}
        <Section title="기술 구성">
          <dl>
            <DefinitionRow label="개발 구분">{DEV_TYPE_LABELS[tech.dev_type]}</DefinitionRow>
            {tech.base_model ? (
              <DefinitionRow label="베이스 모델">{tech.base_model}</DefinitionRow>
            ) : null}
            {tech.metrics.some((m) => m.dataset) ? (
              <DefinitionRow label="평가 데이터셋">
                <ul className="flex flex-col gap-1">
                  {[...new Set(tech.metrics.map((m) => m.dataset).filter(Boolean))].map(
                    (dataset) => (
                      <li key={dataset}>{dataset}</li>
                    ),
                  )}
                </ul>
              </DefinitionRow>
            ) : null}
          </dl>
        </Section>

        {/* 7. 관련 자료 및 함께 쓰는 기술 */}
        {tech.resources.length > 0 || related.length > 0 ? (
          <Section title="관련 자료">
            {tech.resources.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {tech.resources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900"
                    >
                      {resource.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {related.length > 0 ? (
              <div className={tech.resources.length > 0 ? 'mt-6' : ''}>
                <h3 className="text-sm font-medium text-ink-700">함께 쓰는 기술</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tech/${item.id}`}
                      className="rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 hover:border-ink-400"
                    >
                      {item.name_ko}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </Section>
        ) : null}
      </div>

      <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
        <p className="text-sm text-ink-700">
          이 기술의 적용 가능성을 검토하고 계신가요?
        </p>
        <Link
          href="/#contact"
          className="mt-3 inline-block rounded bg-ink-800 px-4 py-2 text-sm text-white hover:bg-ink-900"
        >
          도입 문의하기
        </Link>
      </div>
    </article>
  );
}
