import Link from 'next/link';
import { DemoSlot } from '@/components/demo/DemoSlot';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { MetricStat, MetricTable } from './MetricDisplay';
import {
  DEV_TYPE_LABELS,
  MATURITY_LABELS,
  type Maturity,
} from '@/lib/domain/enums';
import { pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicTech } from '@/lib/domain/types';
import { BRAND } from '@/lib/brand';
import { accentStyle, cn } from '@/lib/ui/domain';

function Section({
  id,
  title,
  description,
  children,
}: {
  /** 옆 레일의 바로가기가 이 앵커로 연결된다 */
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-200 pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DefinitionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ink-100 py-3 last:border-b-0 sm:flex-row sm:gap-6">
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
 *
 * 넓은 화면에서는 본문 옆에 요약 레일을 세운다. 본문이 한 열로만 서면
 * 1440px 화면의 절반이 여백이고, 검증·성숙도·대표 수치를 보려면 화면을
 * 끝까지 내려야 한다. 레일은 본문의 순서를 바꾸지 않는다 — 본문에 있는
 * 내용을 항상 보이는 자리에 요약해 둘 뿐이다.
 */
export function TechDetail({
  tech,
  related,
  usedIn = [],
  unlisted = false,
  restricted = false,
}: {
  tech: PublicTech;
  /** 함께 쓰는 기술 — 외부 공개 대상만 넘어온다. */
  related: PublicTech[];
  /** 이 기술을 구성으로 쓰는 제품 — 제품 데이터에서 역으로 조회한 결과다. */
  usedIn?: { id: string; title: string; name_en?: string }[];
  /** 링크 공개 — 목록에 없는 화면이다. 방문자에게 그 사실을 알린다. */
  unlisted?: boolean;
  /** 과제 연계로 일부 항목이 빠져 있다. 빈 자리의 이유를 밝힌다. */
  restricted?: boolean;
}) {
  const style = accentStyle(tech.domain_accent);
  const business = tech.business;
  /*
    두 값은 층위가 다르다. 산업군은 "안전·보안" 같은 대분류로 산업별 화면과
    이어지고, 수요처는 "공항·항만" 처럼 실제 도입처다.
  */
  const industries = tech.industries;
  const buyers = business.target_industries?.filter((buyer) => buyer.trim()) ?? [];

  const headline = pickHeadlineMetric(
    tech.metrics as never,
    tech.demo.type === 'metric' ? tech.demo.highlight_metric : undefined,
  );

  const hasAdoption = Boolean(
    business.io?.input || business.io?.output || business.requirements?.length,
  );
  const hasResources = tech.resources.length > 0 || related.length > 0;

  /* 레일의 바로가기 — 실제로 존재하는 블록만 나열한다 */
  const jumps = [
    { id: 'demo', label: '데모' },
    tech.metrics.length > 0 || restricted ? { id: 'metrics', label: '성능 지표' } : null,
    hasAdoption ? { id: 'adoption', label: '도입 정보' } : null,
    { id: 'composition', label: '기술 구성' },
    hasResources ? { id: 'resources', label: '관련 자료' } : null,
  ].filter((jump): jump is { id: string; label: string } => jump !== null);

  const mailto = `mailto:${BRAND.contact.email}?subject=${encodeURIComponent(
    `[도입 문의] ${tech.name_ko}`,
  )}`;

  return (
    <article>
      {/*
        링크로만 닿는 화면임을 밝힌다. 목록에 없는 이유를 모르면 방문자는
        사이트가 잘못된 줄 알고, 링크를 아무 데나 옮겨 붙일 수도 있다.
      */}
      {unlisted ? (
        <div className="border-b border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)]">
          <p className="mx-auto max-w-6xl px-4 py-3 text-sm text-[var(--color-signal-warn)]">
            개별 안내용으로 공유된 화면입니다. 목록과 검색에는 공개되어 있지 않습니다.
          </p>
        </div>
      ) : null}

      {/* 1. 헤더 — 카탈로그 히어로와 같은 톤으로 이어 붙인다 */}
      <header className="grid-backdrop bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/tech?domain=${tech.domain}`}
              className="inline-flex items-center gap-1.5 font-medium text-white/90 hover:text-white"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', style.dotBright)} />
              {tech.domain_label}
            </Link>
            <span className="text-ink-600">·</span>
            <span className="text-ink-300">{tech.category}</span>
            {tech.team ? (
              <>
                <span className="text-ink-600">·</span>
                <span className="text-ink-400">{tech.team}</span>
              </>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {tech.name_ko}
          </h1>
          {tech.name_en ? <p className="mt-1.5 text-sm text-ink-500">{tech.name_en}</p> : null}
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">{tech.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <VerificationBadge
              level={tech.verification.level}
              body={tech.verification.body}
              onDark
            />
            <DemoTypeBadge type={tech.demo.type} onDark />
            {business.maturity ? (
              <span className="text-sm text-ink-400">
                성숙도 · {MATURITY_LABELS[business.maturity as Maturity]}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        {/* 본문 — 블록 순서는 여기서만 정한다 */}
        <div className="flex min-w-0 flex-col gap-8">
          {/* 2. 해결하는 문제 / 적용 대상 산업 — 지표보다 먼저 온다 */}
          <section className={cn('rounded-lg border-l-4 bg-white p-6', style.border)}>
            <h2 className="text-xs font-medium tracking-wide text-ink-400 uppercase">
              해결하는 문제
            </h2>
            <p className="mt-2 text-lg leading-relaxed text-ink-900 sm:text-xl">
              {business.problem ?? tech.summary}
            </p>

            {industries.length > 0 || buyers.length > 0 ? (
              <div className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-4">
                {industries.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                      산업군
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
                {/* 산업군보다 좁은 단위 — 글자로만 둔다. 여기서 갈라져 나가는 화면은 없다. */}
                {buyers.length > 0 ? (
                  <p className="text-sm text-ink-500">주요 수요처 · {buyers.join(', ')}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* 이 기술이 들어간 제품 — 기술을 보러 온 방문자를 구매 단위로 안내한다 */}
          {usedIn.length > 0 ? (
            <section className="rounded-lg border border-ink-200 bg-white p-5">
              <h2 className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                이 기술이 들어간 제품
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {usedIn.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="rounded border border-ink-300 px-3 py-2 text-sm font-medium text-ink-800 hover:border-ink-500"
                  >
                    {product.title}
                    {product.name_en && product.name_en !== product.title ? (
                      <span className="ml-1.5 text-xs font-normal text-ink-400">
                        {product.name_en}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* 3. 데모 슬롯 */}
          <Section id="demo" title="데모">
            <DemoSlot tech={tech} />
          </Section>

          {/* 4. 성능 지표 — 지표가 없는 기술은 블록 자체를 생략한다 */}
          {tech.metrics.length > 0 ? (
            <Section id="metrics" title="성능 지표">
              <MetricTable metrics={tech.metrics} />
            </Section>
          ) : restricted ? (
            /*
              수치가 없는 것과 못 밝히는 것은 다르다. 이유를 적지 않으면
              "측정을 안 했다" 로 읽혀 오히려 신뢰를 깎는다.
            */
            <Section id="metrics" title="성능 지표">
              <p className="text-sm leading-relaxed text-ink-500">
                과제 협약에 따라 공개하지 않습니다. 개별 미팅에서 안내해 드립니다.
              </p>
            </Section>
          ) : null}

          {/* 5. 도입 정보 */}
          {hasAdoption ? (
            <Section id="adoption" title="도입 정보">
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
          <Section id="composition" title="기술 구성">
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
          {hasResources ? (
            <Section id="resources" title="관련 자료">
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

          {/* 전환 지점 — 상세를 끝까지 읽은 방문자가 다음에 할 행동을 명시한다 */}
          <section className="rounded-lg bg-ink-950 p-6 sm:p-8">
            <p className="text-lg font-medium text-white">
              {tech.name_ko} 적용을 검토하고 계신가요?
            </p>
            <a
              href={mailto}
              className="mt-5 inline-block rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
            >
              {BRAND.contact.label}
            </a>
          </section>
        </div>

        {/*
          요약 레일. 좁은 화면에서는 내지 않는다 — 본문에 이미 다 있는 내용이라
          중복이고, 모바일에서 본문보다 먼저 서면 블록 순서 요구를 깬다.
        */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-4">
            {/* 대표 수치 — 숫자가 항상 보이는 자리에 선다. 조건 단서는 MetricStat 이 함께 낸다. */}
            {headline ? (
              <div className="rounded-lg border border-ink-200 bg-white p-5">
                <MetricStat metric={headline as never} />
                {tech.metrics.length > 1 ? (
                  <a
                    href="#metrics"
                    className="mt-3 inline-block text-xs text-ink-500 hover:text-ink-900"
                  >
                    전체 지표 {tech.metrics.length}개 보기 ↓
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg border border-ink-200 bg-white p-5">
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">검증</dt>
                  <dd>
                    <VerificationBadge
                      level={tech.verification.level}
                      body={tech.verification.body}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">데모</dt>
                  <dd>
                    <DemoTypeBadge type={tech.demo.type} />
                  </dd>
                </div>
                {business.maturity ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-500">성숙도</dt>
                    <dd className="text-ink-900">
                      {MATURITY_LABELS[business.maturity as Maturity]}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <nav className="mt-4 border-t border-ink-100 pt-4">
                <ul className="flex flex-col gap-1.5">
                  {jumps.map((jump) => (
                    <li key={jump.id}>
                      <a
                        href={`#${jump.id}`}
                        className="text-sm text-ink-600 hover:text-ink-900 hover:underline"
                      >
                        {jump.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <a
                href={mailto}
                className="mt-4 block rounded bg-ink-800 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-ink-900"
              >
                {BRAND.contact.label}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
