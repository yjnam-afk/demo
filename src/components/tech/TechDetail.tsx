import Link from 'next/link';
import { DemoSlot } from '@/components/demo/DemoSlot';
import { DemoTypeBadge, VerificationBadge } from '@/components/ui/Badge';
import { JumpBar } from './JumpBar';
import { MetricStatGrid } from './MetricDisplay';
import { PdfPreview } from './PdfPreview';
import {
  DEV_TYPE_LABELS,
  MATURITY_LABELS,
  type Maturity,
} from '@/lib/domain/enums';
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
  aside,
  children,
}: {
  /** 옆 레일의 바로가기가 이 앵커로 연결된다 */
  id?: string;
  title: string;
  description?: string;
  /** 제목 왼쪽에 세우는 축 색 틱. 긴 세로 흐름에서 구간 시작을 표시한다. */
  tick?: string;
  /** 제목 줄 오른쪽 — 그 구간 전체에 걸리는 표식(인증 배지 등) */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // data-reveal — 스크롤로 들어올 때 살짝 떠오른다(ui/Reveal.tsx)
    <section id={id} data-reveal className="scroll-mt-40 border-t border-ink-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5">
          {tick ? <span className={cn('h-4 w-1 rounded-full', tick)} /> : null}
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        </div>
        {aside}
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
    <div className="glass-card p-5">
      <div className="text-xs font-medium tracking-wide text-ink-400 uppercase">{label}</div>
      <div className="mt-1.5 text-base font-medium text-ink-900">{children}</div>
    </div>
  );
}

/**
 * 드라이브 자료 미리보기.
 *
 * 드라이브가 만들어 주는 첫 페이지/첫 프레임 썸네일을 그림으로 펼친다.
 * 원문 주소(alt=media)는 다운로드로 떨어져 인라인 뷰어에 걸 수 없고,
 * 형식 표식(.pdf 등)이 안 붙은 링크도 있으므로 — 형식을 몰라도 이 방식은
 * 동작한다. 누르면 드라이브 뷰어에서 원문이 열린다.
 */
function DriveResourceFigure({ id, label }: { id: string; label: string }) {
  return (
    <figure className="glass-card overflow-hidden rounded-lg border border-ink-200/70">
      <a href={driveViewUrl(id)} target="_blank" rel="noopener">
        {/*
          고정 높이 영역에 문서 전체를 담는다(contain). 인증서·성적서는 A4
          세로라, 가로 비율로 윗부분만 자르면 기관 직인이 있는 아래쪽이
          잘려 나간다. 남는 여백은 바탕색이 채운다.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={driveThumbnailUrl(id)}
          alt={label}
          loading="lazy"
          className="h-80 w-full bg-ink-50 object-contain sm:h-96"
        />
      </a>
      <figcaption className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
        <span className="truncate">{label}</span>
        <a
          href={driveViewUrl(id)}
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
  const industries = tech.industries;

  const certified = tech.verification.level === 'third_party';
  /*
    지표는 가르지 않는다. 평가는 목표 기준까지 포함해 한 몸이고, 그 기준
    자체가 인증 시험과 이어져 있어 인증 수치와 자체 수치를 다른 구간에
    세우면 관계가 끊긴다. 수치는 전부 성능 지표에 서고, 어떤 수치가 인증
    시험 항목인지는 셀 안의 출처 칩이 가른다. 인증 구간은 숫자를 다시
    세우지 않고 그 평가를 공인한 기관·시험명을 밝힌다.

    시험명은 검증 구간의 인증 시험명 필드가 우선이고, 비어 있으면 예전
    방식대로 인증 출처가 붙은 지표의 데이터셋 이름에서 모은다(필드가
    생기기 전에 입력된 기술들을 위한 하위 호환).
  */
  const certNames = certified
    ? tech.verification.cert_name?.trim()
      ? [tech.verification.cert_name.trim()]
      : [
          ...new Set(
            tech.metrics
              .filter((metric) => metric.source && /인증/.test(metric.source))
              .map((metric) => metric.dataset)
              .filter((name): name is string => Boolean(name?.trim())),
          ),
        ]
    : [];
  const certMeta = [
    tech.verification.cert_no ? `인증번호 ${tech.verification.cert_no}` : null,
    tech.verification.valid_until ? `유효기간 ${tech.verification.valid_until}` : null,
  ].filter(Boolean);

  const hasAdoption = Boolean(
    business.io?.input || business.io?.output || business.requirements?.length,
  );
  const hasResources = tech.resources.length > 0;
  /*
    데모 블록을 세울지. 지표만 있는 기술은 바로 아래 성능 지표 블록과 같은
    숫자가 두 번 서므로 생략하지만, 미디어 구간에 영상이 있으면 그것만으로
    데모가 성립한다 — 데모 타입이 기본값인 채 영상만 올린 기술이 화면에서
    영상을 통째로 잃던 자리다.
  */
  const hasDemo =
    (tech.demo.type !== 'metric' && tech.demo.type !== 'none') || Boolean(tech.media.video);

  /* 레일의 바로가기 — 실제로 존재하는 블록만 나열한다 */
  const jumps = [
    hasDemo ? { id: 'demo', label: '데모' } : null,
    tech.metrics.length > 0 || restricted ? { id: 'metrics', label: '성능 지표' } : null,
    certified ? { id: 'certification', label: '인증' } : null,
    hasAdoption ? { id: 'adoption', label: '도입 정보' } : null,
    { id: 'composition', label: '기술 구성' },
    hasResources ? { id: 'resources', label: '관련 자료' } : null,
    related.length > 0 ? { id: 'related', label: '함께 쓰는 기술' } : null,
    industries.length > 0 ? { id: 'industries', label: '적용 산업군' } : null,
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
          {/* 분류는 한 덩어리 — 목록과 같은 문법으로, 카테고리도 같은 무게로 선다 */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/?domain=${tech.domain}`}
              className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/10 px-2.5 py-1 font-medium text-white/90 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', style.dotBright)} />
              {tech.domain_label}
              <span className="text-white/30">·</span>
              {tech.category}
            </Link>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {tech.name_ko}
          </h1>
          {/* 영문명은 내지 않는다 — 방문자의 판단에 보태는 것이 없다 */}
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-300">{tech.summary}</p>

          {/* 검증·데모·성숙도는 같은 성격의 표식이다 — 셋 다 같은 칩으로 세운다 */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <VerificationBadge
              level={tech.verification.level}
              body={tech.verification.body}
              onDark
            />
            <DemoTypeBadge type={tech.demo.type} onDark />
            {business.maturity ? (
              <span className="inline-flex shrink-0 items-center rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80 backdrop-blur-md">
                {MATURITY_LABELS[business.maturity as Maturity]}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/*
        구간 바로가기 — 헤더 아래 붙어 따라온다.

        전에는 오른쪽 고정 레일이 맡았는데, 담긴 것이 헤더 배지와 같은
        요약(검증·데모·성숙도)과 링크 몇 개뿐이라 화면 4분의 1을 차지하고도
        아무 정보도 주지 못했다. 요약은 이미 헤더에 있으므로 레일을 없애고,
        이동 수단만 가로 막대로 남긴다. 본문이 전체 폭을 되찾는다.
      */}
      <JumpBar jumps={jumps} />

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* 본문 — 블록 순서는 여기서만 정한다 */}
        <div className="flex min-w-0 flex-col gap-8">
          {/*
            2. 해결하는 문제 — 지표보다 먼저 온다.

            이 기술이 존재하는 이유라서 본문에서 가장 큰 글자를 가져간다.
            제목 줄은 다른 구간과 같은 문법(틱+제목)으로 두되, 문장이 앉는
            바닥만 다르게 한다 — 다른 구간의 카드는 흰 유리인데 여기는 축
            색을 옅게 깐 판이다. 형태를 새로 만들지 않고 재질만 바꾸므로
            구간 위계는 그대로이면서 이 문장이 다른 것임은 한눈에 읽힌다.
          */}
          <section data-reveal>
            <div className="flex items-center gap-2.5">
              <span className={cn('h-4 w-1 rounded-full', style.bar)} />
              <h2 className="text-lg font-semibold tracking-tight text-ink-900">해결하는 문제</h2>
            </div>
            <div className={cn('mt-4 rounded-xl px-5 py-6 sm:px-7', style.bg)}>
              <p className="max-w-3xl text-2xl leading-snug font-semibold tracking-tight text-ink-900 sm:text-3xl">
                {business.problem ?? tech.summary}
              </p>
            </div>

            {/*
              산업군 칩은 여기 두지 않는다 — 상단은 문제 문장이 주인공이고,
              산업군은 '이 기술에서 어디로 이어지나' 성격이라 하단의 함께
              쓰는 기술 옆이 제자리다. (산업 표시는 산업군 하나로 통일한다.
              주요 수요처를 따로 세우면 같은 이야기가 두 줄로 반복된다.)
            */}
          </section>

          {/* 이 기술이 들어간 제품 — 기술을 보러 온 방문자를 구매 단위로 안내한다 */}
          {usedIn.length > 0 ? (
            <section data-reveal className="glass-card rounded-lg border border-ink-200/70 p-5">
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

          {/*
            3. 데모 슬롯.
            metric 타입은 여기서 내지 않는다 — 보여줄 것이 지표뿐이라, 바로
            아래 성능 지표 블록과 같은 숫자가 두 번 서게 된다.
          */}
          {hasDemo ? (
            <Section id="demo" title="데모" tick={style.bar}>
              <DemoSlot tech={tech} />
            </Section>
          ) : null}

          {/*
            인증 — 제3자 인증이 있으면 독립 블록으로 세운다.
            지표 구간의 부속으로 두면 배지와 칩 사이에 묻힌다. 인증은 이
            사이트가 내세우는 신뢰 자산이라 제 이름의 자리를 갖는다.
          */}
          {/* 4. 성능 지표 — 모든 수치가 여기 선다. 지표가 없는 기술은 블록 자체를 생략한다 */}
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

          {/*
            5. 인증 — 성능 지표 뒤에 온다. 위 평가를 공인한 제3자가 누구인지
            밝히는 블록이라 "우리 측정 → 제3자 확인" 순서로 읽힌다.
            숫자는 다시 세우지 않는다 — 수치는 전부 성능 지표에 있다.
          */}
          {certified ? (
            <Section id="certification" title="인증" tick={style.bar}>
              <div className="rounded-lg border border-[var(--color-signal-ok)]/30 bg-[var(--color-signal-ok-soft)] px-6 py-5">
                <div className="flex items-start gap-3.5">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-signal-ok)]"
                    aria-hidden
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="h-4 w-4"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5 6.5 12 13 4.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-sm font-medium text-[var(--color-signal-ok)]">
                      <span>제3자 인증</span>
                      {tech.verification.body ? (
                        <>
                          <span aria-hidden className="opacity-50">
                            ·
                          </span>
                          <span>인증기관 {tech.verification.body}</span>
                        </>
                      ) : null}
                    </div>
                    {certNames.length > 0 ? (
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {certNames.map((name) => (
                          <p
                            key={name}
                            className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl"
                          >
                            {name}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {certMeta.length > 0 ? (
                      <p className="mt-1.5 text-sm text-ink-500">{certMeta.join(' · ')}</p>
                    ) : null}
                    {/*
                      지표와의 관계를 설명하는 문장은 두지 않는다 — 지표 셀의
                      인증 칩과 이 블록의 시험명으로 관계는 이미 보이고,
                      화면을 해설하는 문장은 읽는 사람을 헷갈리게만 했다.
                    */}
                  </div>
                </div>
              </div>
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
                <div className="glass-card mt-2 rounded-lg border border-ink-200/70 p-5">
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
            {/*
              평가 데이터셋은 여기 다시 세우지 않는다 — 지표 셀 하단이 이미
              지표별로 보여 주고 있어, 여기 모으면 같은 이름이 두 번 선다.
            */}
            <div
              className={cn(
                'grid gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200',
                tech.base_model && 'sm:grid-cols-2',
              )}
            >
              {/* 프리셋 id 면 라벨로, 직접 입력한 구분이면 그 문구 그대로 */}
              <ValueCell label="개발 구분">
                {DEV_TYPE_LABELS[tech.dev_type as keyof typeof DEV_TYPE_LABELS] ?? tech.dev_type}
              </ValueCell>
              {tech.base_model ? (
                <ValueCell label="베이스 모델">{tech.base_model}</ValueCell>
              ) : null}
            </div>
          </Section>

          {/* 7. 관련 자료 */}
          {hasResources ? (
            <Section id="resources" title="관련 자료" tick={style.bar}>
              {/*
                미리보기는 한 격자에 균일한 타일로 선다. 자료마다 전체 폭으로
                쌓으면 관련 자료가 본문보다 넓은 자리를 차지한다 — 여기는
                확인용이고, 정독은 원문에서 한다.
                  이미지 → 그대로 / 드라이브 → 첫 장 썸네일(형식 무관) /
                  업로드 PDF → 내장 뷰어. 외부 링크만 버튼으로 남는다.
              */}
              {tech.resources.some(
                (resource) => isImagePath(resource.url) || isPdfPath(resource.url) || driveIdFromPath(resource.url),
              ) ? (
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  {tech.resources.map((resource) => {
                    const driveId = driveIdFromPath(resource.url);

                    if (!driveId && isImagePath(resource.url)) {
                      return (
                        <figure
                          key={resource.url}
                          className="glass-card overflow-hidden rounded-lg border border-ink-200/70"
                        >
                          <a href={resource.url} target="_blank" rel="noopener">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resource.url}
                              alt={resource.label}
                              loading="lazy"
                              className="h-80 w-full bg-ink-50 object-contain sm:h-96"
                            />
                          </a>
                          <figcaption className="border-t border-ink-100 px-4 py-2.5 text-sm text-ink-600">
                            {resource.label}
                          </figcaption>
                        </figure>
                      );
                    }

                    if (driveId) {
                      return (
                        <DriveResourceFigure key={resource.url} id={driveId} label={resource.label} />
                      );
                    }

                    if (isPdfPath(resource.url)) {
                      return (
                        <figure
                          key={resource.url}
                          className="glass-card overflow-hidden rounded-lg border border-ink-200/70"
                        >
                          {/*
                            내장 뷰어(<object>)를 쓰지 않는다 — iOS 사파리가
                            지원하지 않아 모바일에서 통째로 빈 칸이 됐다.
                            첫 장을 캔버스에 직접 그려 어디서든 같게 보인다.
                          */}
                          <div className="h-80 w-full sm:h-96">
                            <PdfPreview url={resource.url} label={resource.label} />
                          </div>
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
                    }

                    return null;
                  })}
                </div>
              ) : null}

              {tech.resources.some(
                (resource) =>
                  !isImagePath(resource.url) &&
                  !isPdfPath(resource.url) &&
                  !driveIdFromPath(resource.url),
              ) ? (
                /* 밑줄 글자는 본문에 묻힌다. 내려받을 수 있는 것은 눌리는 물건으로 보여야 한다. */
                <ul className="grid gap-2 sm:grid-cols-2">
                  {tech.resources
                    .filter(
                      (resource) =>
                        !isImagePath(resource.url) &&
                        !isPdfPath(resource.url) &&
                        !driveIdFromPath(resource.url),
                    )
                    .map((resource) => (
                      <li key={resource.url}>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener"
                          className="glass-card flex items-center justify-between gap-3 rounded-lg border border-ink-200/70 px-4 py-3 text-sm font-medium text-ink-800 transition-colors hover:border-ink-500"
                        >
                          <span className="truncate">{resource.label}</span>
                          <span className="shrink-0 text-ink-400" aria-hidden>↗</span>
                        </a>
                      </li>
                    ))}
                </ul>
              ) : null}

            </Section>
          ) : null}

          {/*
            함께 쓰는 기술·적용 산업군은 관련 자료의 하위 항목이 아니라 같은
            급의 구간이다. 작은 제목으로 안에 끼워 두니 칩 무더기에 묻혀
            무엇의 목록인지 읽히지 않았다 — 다른 구간과 같은 제목 문법
            (축 색 틱 + 큰 제목)으로 세운다. 기술 이름만 서면 여전히 칩
            무더기라, 이름 옆에 한 줄 요약을 실은 카드로 눌러볼 이유를 준다.
          */}
          {related.length > 0 ? (
            <Section id="related" title="함께 쓰는 기술" tick={style.bar}>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/tech/${item.id}`}
                    className="glass-card group rounded-lg border border-ink-200/70 p-4 transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-md hover:shadow-ink-900/5"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink-900">{item.name_ko}</span>
                      <span
                        className="shrink-0 text-ink-300 transition-colors group-hover:text-ink-600"
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                    {item.summary ? (
                      <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ink-500">
                        {item.summary}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}

          {/* 적용 산업군 — 상단에서 내려온 자리. 문제 문장 곁을 비우고 연결 정보끼리 모은다 */}
          {industries.length > 0 ? (
            <Section id="industries" title="적용 산업군" tick={style.bar}>
              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <span
                    key={industry}
                    className="rounded bg-ink-100 px-2.5 py-1 text-sm text-ink-700"
                  >
                    {industry}
                  </span>
                ))}
              </div>
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
          <section data-reveal className="rounded-lg bg-ink-950 p-6 sm:p-8">
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

      </div>
    </article>
  );
}
