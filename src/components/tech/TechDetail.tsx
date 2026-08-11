import Link from 'next/link';
import { DemoSlot } from '@/components/demo/DemoSlot';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { MetricStat, MetricStatGrid } from './MetricDisplay';
import {
  DEV_TYPE_LABELS,
  MATURITY_LABELS,
  type Maturity,
} from '@/lib/domain/enums';
import { pickHeadlineMetric } from '@/lib/domain/metric';
import type { PublicTech } from '@/lib/domain/types';
import { BRAND } from '@/lib/brand';
import { accentStyle, cn } from '@/lib/ui/domain';
import { isImagePath, isPdfPath } from '@/lib/media';
import { driveIdFromPath, driveThumbnailUrl, driveViewUrl } from '@/lib/gdrive';

function Section({
  id,
  title,
  description,
  tick,
  children,
}: {
  /** 옆 레일의 바로가기가 이 앵커로 연결된다 */
  id?: string;
  title: string;
  description?: string;
  /** 제목 왼쪽에 세우는 축 색 틱. 긴 세로 흐름에서 구간 시작을 표시한다. */
  tick?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-200 pt-8">
      <div className="flex items-center gap-2.5">
        {tick ? <span className={cn('h-4 w-1 rounded-full', tick)} /> : null}
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
      </div>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * 라벨 붙은 값 한 칸.
 *
 * 정의 목록(dl)의 문제는 값이 "본문 옆 회색 메타"로 읽힌다는 것이었다.
 * 칸으로 만들면 값이 그 칸의 내용이 된다 — 도입 정보와 기술 구성이 쓴다.
 */
function ValueCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5">
      <div className="text-xs font-medium tracking-wide text-ink-400 uppercase">{label}</div>
      <div className="mt-1.5 text-base font-medium text-ink-900">{children}</div>
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
          {/*
            2. 해결하는 문제 — 지표보다 먼저 온다.

            카드에 담지 않는다. 이 페이지의 다른 모든 정보는 상자 안에 있으므로,
            이 문장만 상자 없이 큰 글자로 세우면 그 대비가 곧 강조가 된다.
            이 기술이 존재하는 이유라서 본문에서 가장 큰 글자를 가져간다.
          */}
          <section className={cn('border-l-4 py-1 pl-5 sm:pl-6', style.border)}>
            <h2 className="text-xs font-medium tracking-wide text-ink-400 uppercase">
              해결하는 문제
            </h2>
            <p className="mt-3 max-w-3xl text-2xl leading-snug font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {business.problem ?? tech.summary}
            </p>

            {industries.length > 0 || buyers.length > 0 ? (
              <div className="mt-6 flex flex-col gap-2">
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
          <Section id="demo" title="데모" tick={style.bar}>
            <DemoSlot tech={tech} />
          </Section>

          {/* 4. 성능 지표 — 지표가 없는 기술은 블록 자체를 생략한다 */}
          {tech.metrics.length > 0 ? (
            <Section id="metrics" title="성능 지표" tick={style.bar}>
              <MetricStatGrid metrics={tech.metrics} />
            </Section>
          ) : restricted ? (
            /*
              수치가 없는 것과 못 밝히는 것은 다르다. 이유를 적지 않으면
              "측정을 안 했다" 로 읽혀 오히려 신뢰를 깎는다.
            */
            <Section id="metrics" title="성능 지표" tick={style.bar}>
              <p className="text-sm leading-relaxed text-ink-500">
                과제 협약에 따라 공개하지 않습니다. 개별 미팅에서 안내해 드립니다.
              </p>
            </Section>
          ) : null}

          {/* 5. 도입 정보 */}
          {hasAdoption ? (
            <Section id="adoption" title="도입 정보" tick={style.bar}>
              {/*
                입력과 출력은 나열이 아니라 흐름이다. 무엇을 넣으면 무엇이
                나오는지가 이 기술의 계약이므로, 두 칸을 화살표로 잇는다.
              */}
              {business.io?.input || business.io?.output ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  {business.io?.input ? (
                    <div className="overflow-hidden rounded-lg border border-ink-200">
                      <ValueCell label="입력">{business.io.input}</ValueCell>
                    </div>
                  ) : null}
                  {business.io?.input && business.io?.output ? (
                    <div className="hidden items-center text-xl text-ink-300 sm:flex" aria-hidden>
                      →
                    </div>
                  ) : null}
                  {business.io?.output ? (
                    <div className="overflow-hidden rounded-lg border border-ink-200">
                      <ValueCell label="출력">{business.io.output}</ValueCell>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/*
                조건과 제약은 계약의 단서 조항이다 — 숨기는 것이 아니라 세워서
                보여 준다. 이 목록이 정직해야 위의 수치가 신뢰를 얻는다.
              */}
              {business.requirements?.length ? (
                <div className="mt-2 rounded-lg border border-ink-200 bg-white p-5">
                  <div className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                    도입 조건 및 제약
                  </div>
                  <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {business.requirements.map((requirement) => (
                      <li key={requirement} className="flex gap-2.5 text-sm text-ink-800">
                        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                        <span className="leading-relaxed">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>
          ) : null}

          {/* 6. 기술 구성 — 칸이 두세 개뿐이라 격자로 나란히 세운다 */}
          <Section id="composition" title="기술 구성" tick={style.bar}>
            <div
              className={cn(
                'grid gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200',
                (tech.base_model || tech.metrics.some((m) => m.dataset)) && 'sm:grid-cols-2',
                tech.base_model && tech.metrics.some((m) => m.dataset) && 'lg:grid-cols-3',
              )}
            >
              <ValueCell label="개발 구분">{DEV_TYPE_LABELS[tech.dev_type]}</ValueCell>
              {tech.base_model ? (
                <ValueCell label="베이스 모델">{tech.base_model}</ValueCell>
              ) : null}
              {tech.metrics.some((m) => m.dataset) ? (
                <ValueCell label="평가 데이터셋">
                  <ul className="flex flex-col gap-1">
                    {[...new Set(tech.metrics.map((m) => m.dataset).filter(Boolean))].map(
                      (dataset) => (
                        <li key={dataset}>{dataset}</li>
                      ),
                    )}
                  </ul>
                </ValueCell>
              ) : null}
            </div>
          </Section>

          {/* 7. 관련 자료 및 함께 쓰는 기술 */}
          {hasResources ? (
            <Section id="resources" title="관련 자료" tick={style.bar}>
              {/*
                이미지는 링크로 접어 두지 않고 그대로 펼친다 — 시험 성적서나
                구성도는 열어 보게 하는 것보다 보여 주는 쪽이 빠르다.
                파일과 외부 링크는 눌리는 버튼으로 남는다.
              */}
              {tech.resources.some((resource) => isImagePath(resource.url)) ? (
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  {tech.resources
                    .filter((resource) => isImagePath(resource.url))
                    .map((resource) => (
                      <figure
                        key={resource.url}
                        className="overflow-hidden rounded-lg border border-ink-200 bg-white"
                      >
                        <a href={resource.url} target="_blank" rel="noopener">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resource.url}
                            alt={resource.label}
                            loading="lazy"
                            className="w-full bg-ink-50"
                          />
                        </a>
                        <figcaption className="border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
                          {resource.label}
                        </figcaption>
                      </figure>
                    ))}
                </div>
              ) : null}

              {/*
                결과보고서 PDF.

                드라이브 PDF 는 원문 주소가 다운로드로 떨어져 인라인 뷰어(object)에
                걸 수 없다. 대신 드라이브가 만들어 주는 첫 페이지 썸네일을 그림으로
                펼치고, 누르면 드라이브 뷰어에서 원문이 열린다. 업로드된 PDF 는
                브라우저 내장 뷰어로 그대로 펼친다.
              */}
              {tech.resources.filter((resource) => isPdfPath(resource.url)).map((resource) => {
                const driveId = driveIdFromPath(resource.url);

                if (driveId) {
                  return (
                    <figure
                      key={resource.url}
                      className="mb-4 overflow-hidden rounded-lg border border-ink-200 bg-white"
                    >
                      <a href={driveViewUrl(driveId)} target="_blank" rel="noopener">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={driveThumbnailUrl(driveId)}
                          alt={resource.label}
                          loading="lazy"
                          className="mx-auto max-h-[680px] w-auto bg-ink-50"
                        />
                      </a>
                      <figcaption className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
                        <span className="truncate">{resource.label}</span>
                        <a
                          href={driveViewUrl(driveId)}
                          target="_blank"
                          rel="noopener"
                          className="shrink-0 text-ink-500 hover:text-ink-900"
                        >
                          원문 열기 ↗
                        </a>
                      </figcaption>
                    </figure>
                  );
                }

                return (
                  <figure
                    key={resource.url}
                    className="mb-4 overflow-hidden rounded-lg border border-ink-200 bg-white"
                  >
                    <object
                      data={resource.url}
                      type="application/pdf"
                      className="block h-[560px] w-full sm:h-[680px]"
                      aria-label={resource.label}
                    >
                      {/* 인라인 뷰어가 없는 브라우저(주로 모바일)는 버튼으로 내려간다 */}
                      <div className="p-4">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:border-ink-500"
                        >
                          <span className="truncate">{resource.label}</span>
                          <span className="shrink-0 text-ink-400" aria-hidden>↗</span>
                        </a>
                      </div>
                    </object>
                    <figcaption className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
                      <span className="truncate">{resource.label}</span>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener"
                        className="shrink-0 text-ink-500 hover:text-ink-900"
                      >
                        새 창에서 열기 ↗
                      </a>
                    </figcaption>
                  </figure>
                );
              })}

              {tech.resources.some(
                (resource) => !isImagePath(resource.url) && !isPdfPath(resource.url),
              ) ? (
                /* 밑줄 글자는 본문에 묻힌다. 내려받을 수 있는 것은 눌리는 물건으로 보여야 한다. */
                <ul className="grid gap-2 sm:grid-cols-2">
                  {tech.resources
                    .filter((resource) => !isImagePath(resource.url) && !isPdfPath(resource.url))
                    .map((resource) => (
                      <li key={resource.url}>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:border-ink-500"
                        >
                          <span className="truncate">{resource.label}</span>
                          <span className="shrink-0 text-ink-400" aria-hidden>↗</span>
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

          {/*
            전환 지점 — 상세를 끝까지 읽은 방문자가 다음에 할 행동을 명시한다.
            기술 이름은 문장에 끼우지 않는다. "일정 구간을 반복적으로 서성이는
            인원 적용을 검토하고 계신가요?" 처럼 서술형 이름이면 문장이 깨진다.
            어느 기술에 대한 문의인지는 메일 제목이 나른다.
          */}
          {/*
            구호를 쓰지 않는다 — "함께 검토해 드립니다" 같은 문장은 어느
            사이트에나 있어 읽고 나면 남는 것이 없다. 무엇을 받게 되는지와
            문의처만 사실대로 적는다.
          */}
          <section className="rounded-lg bg-ink-950 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">도입 문의</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
              기술 자료와 적용 사례, 도입 조건을 안내해 드립니다.
            </p>
            <a
              href={mailto}
              className="numeric mt-5 inline-block rounded bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-200"
            >
              {BRAND.contact.email}
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
              {/*
                여기에 도입 문의 버튼을 두지 않는다. GNB 와 본문 하단에 이미
                있어서, 레일까지 얹으면 한 화면에 같은 버튼이 세 개 선다.
              */}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
