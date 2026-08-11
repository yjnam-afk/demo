'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field, Row, Section, Select, TagList, TextArea, TextInput } from './fields';
import { MediaUpload } from './MediaUpload';
import { IndustryPicker } from './IndustryPicker';
import {
  DEMO_TYPES,
  DEMO_TYPE_LABELS,
  DEV_TYPES,
  DEV_TYPE_LABELS,
  INPUT_KINDS,
  INPUT_KIND_LABELS,
  MATURITY_LABELS,
  MATURITY_LEVELS,
  VISIBILITY_HINTS,
  type Visibility,
  METRIC_DIRECTIONS,
  METRIC_DIRECTION_LABELS,
  VERIFICATION_LABELS,
  VERIFICATION_LEVELS,
  type Domain,
  type MetricDirection,
} from '@/lib/domain/enums';
import { validateForPublish } from '@/lib/domain/validate';
import type { CategoryStore, DomainDef, Industry, Tech } from '@/lib/domain/types';
import { cn } from '@/lib/ui/domain';

/** 방향은 기본값을 두지 않는다 — 관리자가 반드시 고르게 하려면 빈 값에서 출발해야 한다. */
type MetricDraft = {
  label: string;
  value: string;
  target: string;
  direction: MetricDirection | '';
  condition: string;
  dataset: string;
  source: string;
  dataset_url: string;
};

type Draft = Omit<Tech, 'metrics'> & { metrics: MetricDraft[] };

const options = <T extends string>(list: readonly T[], labels: Record<T, string>) =>
  list.map((value) => ({ value, label: labels[value] }));

/**
 * 과제 연계 시 대외로 내보내지 않는 항목.
 * 2026 국제치안산업대전 전시 기획안의 「공통 제외 항목」을 이 화면이 다룰 수
 * 있는 범위로 옮긴 것이다. 관리자가 무엇이 가려지는지 저장 전에 알아야 한다.
 */
const RESTRICTED_FIELDS = [
  '과제명 · 수요처명',
  '베이스 모델 등 알고리즘 · AI 모델 정보',
  '성능 지표와 평가 데이터셋 (시험 결과 · 실증 장소가 드러납니다)',
  '담당 조직',
];

function blank(): Draft {
  const now = new Date().toISOString();
  return {
    id: '',
    name_ko: '',
    name_en: '',
    domain: 'ai',
    category: '',
    industries: [],
    summary: '',
    team: '',
    project: '',
    metrics: [],
    business: { problem: '', target_industries: [], io: { input: '', output: '' }, requirements: [] },
    verification: { level: 'in_development', body: '' },
    dev_type: 'custom',
    base_model: '',
    demo: { type: 'metric' },
    media: {},
    resources: [],
    related_tech: [],
    visibility: 'draft',
    restricted: false,
    order: 0,
    created_at: now,
    updated_at: now,
  };
}

function toDraft(tech: Tech): Draft {
  return {
    ...tech,
    metrics: tech.metrics.map((metric) => ({
      label: metric.label,
      value: String(metric.value),
      target: String(metric.target),
      direction: metric.direction,
      condition: metric.condition ?? '',
      dataset: metric.dataset ?? '',
      source: metric.source ?? '',
      dataset_url: metric.dataset_url ?? '',
    })),
  };
}

/**
 * 외부 공개 검증은 숫자 형태의 Tech 를 기대하므로 화면 상태를 변환해 넘긴다.
 *
 * 빈 값을 0 이나 기본 방향으로 메우지 않는다. 메우면 검증이 통과해 버려서
 * 화면은 "공개 가능"이라고 하는데 서버가 거부하는 어긋남이 생긴다.
 */
function toTech(draft: Draft): Tech {
  return {
    ...draft,
    metrics: draft.metrics.map((metric) => ({
      label: metric.label,
      value: metric.value.trim() === '' ? Number.NaN : Number(metric.value),
      target: metric.target.trim() === '' ? Number.NaN : Number(metric.target),
      direction: metric.direction as MetricDirection,
      condition: metric.condition,
      dataset: metric.dataset,
      source: metric.source,
      dataset_url: metric.dataset_url,
    })),
  };
}

export function TechForm({
  existing,
  categories: initialCategories,
  industries: initialIndustries,
  domains,
  otherTechs,
}: {
  existing: Tech | null;
  categories: CategoryStore;
  industries: Industry[];
  /** 대분류 마스터. 선택지는 코드가 아니라 이 목록이 정한다. */
  domains: DomainDef[];
  otherTechs: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(existing ? toDraft(existing) : blank());
  const [categories, setCategories] = useState(initialCategories);
  const [industries, setIndustries] = useState(initialIndustries);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const setBusiness = (patch: Partial<Draft['business']>) =>
    setDraft((prev) => ({ ...prev, business: { ...prev.business, ...patch } }));

  /**
   * 외부 공개를 막는 사유를 입력하는 동안 실시간으로 보여준다.
   * 같은 검증을 서버가 다시 수행하므로 화면을 우회해도 통과하지 못한다.
   */
  const publishIssues = useMemo(() => validateForPublish(toTech(draft)), [draft]);

  // 지표 방향이 비면 임시저장조차 불가능하다 — 서버 파서가 값 자체를 거부한다.
  const missingDirection = draft.metrics.some((metric) => !metric.direction);
  const blockedFromPublish = publishIssues.length > 0;

  /** 이 공개 범위로 저장할 수 없는 사유. 없으면 저장할 수 있다. */
  function blockReason(visibility: Visibility): string | null {
    if (missingDirection) return '지표 방향을 선택해야 저장할 수 있습니다.';
    if ((visibility === 'public' || visibility === 'link') && blockedFromPublish) {
      const what = visibility === 'link' ? '링크 공개' : '외부 공개';
      return `${what}하려면 다음 항목이 필요합니다 · ${publishIssues
        .map((issue) => issue.label)
        .join(', ')}`;
    }
    return null;
  }

  /**
   * 무엇이 비었는지 말만 하면 그 항목을 긴 폼에서 다시 찾아야 한다.
   * 해당 구간으로 화면을 옮겨 준다.
   */
  function scrollToFirstIssue() {
    const field = missingDirection ? 'metrics' : (publishIssues[0]?.field ?? '');
    const id = field.startsWith('metrics')
      ? 'section-metrics'
      : field.startsWith('business')
        ? 'section-business'
        : field.startsWith('demo')
          ? 'section-demo'
          : field.startsWith('industries')
            ? 'section-basic'
            : null;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function save(visibility: Visibility) {
    /*
      막혔을 때 버튼을 잠가 두면 눌러도 아무 일이 없어서, 왜 안 되는지 모른 채
      이것저것 고쳐 보게 된다. 누르면 사유를 말하고 그 자리로 데려간다.
    */
    const blocked = blockReason(visibility);
    if (blocked) {
      setError(blocked);
      scrollToFirstIssue();
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tech', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tech: { ...toTech(draft), visibility },
          mode: existing ? 'update' : 'create',
          // id 를 바꾼 경우 서버가 어느 기술을 옮기는지 알아야 한다.
          originalId: existing?.id,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: { label: string }[];
        detail?: string;
      };

      if (!response.ok) {
        /*
          검증 실패는 비어 있는 항목 이름을, 서버 오류는 원인 문구를 덧붙인다.
          "저장하지 못했습니다" 만 띄우면 관리자는 서버 로그를 볼 수 없어
          다음에 무엇을 해야 할지 알 수 없다.
        */
        const extra = body.issues?.map((issue) => issue.label).join(', ') ?? body.detail;
        setError(extra ? `${body.error} (${extra})` : (body.error ?? '저장하지 못했습니다.'));
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('서버에 연결하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  async function addCategory() {
    const domainLabel = domains.find((d) => d.id === draft.domain)?.label ?? draft.domain;
    const name = prompt(`${domainLabel} 에 추가할 카테고리명`)?.trim();
    if (!name) return;

    const response = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: draft.domain, name }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      categories?: CategoryStore;
      error?: string;
    };

    if (!response.ok || !body.categories) {
      setError(body.error ?? '카테고리를 추가하지 못했습니다.');
      return;
    }
    setCategories(body.categories);
    set({ category: name });
  }

  // 새로 만든 축에는 카테고리 키가 아직 없다. 없으면 빈 목록으로 둔다.
  const categoryOptions = (categories[draft.domain] ?? []).map((name) => ({
    value: name,
    label: name,
  }));

  return (
    <div className="flex flex-col gap-5 pb-32">
      <Section id="section-basic" title="기본 정보">
        <Row>
          <Field
            label="기술 id"
            required
            hint={
              existing
                ? draft.id !== existing.id
                  ? `주소가 /tech/${draft.id} 로 바뀝니다. 제품 구성과 연계 기술은 함께 옮겨지고, 예전 주소 /tech/${existing.id} 로 들어와도 새 주소로 연결됩니다.`
                  : '바꾸면 주소가 함께 바뀝니다. 예전 주소로 들어온 방문자는 새 주소로 연결됩니다.'
                : '영문 소문자·숫자·하이픈 (URL 에 쓰입니다)'
            }
          >
            <TextInput
              value={draft.id}
              placeholder="intrusion-detection"
              onChange={(event) => set({ id: event.target.value })}
            />
          </Field>
          <Field label="기술명 (한글)" required>
            <TextInput
              value={draft.name_ko}
              onChange={(event) => set({ name_ko: event.target.value })}
            />
          </Field>
        </Row>

        <Row>
          <Field label="기술명 (영문)">
            <TextInput
              value={draft.name_en ?? ''}
              onChange={(event) => set({ name_en: event.target.value })}
            />
          </Field>
          <Field label="대분류" required hint="대분류 관리에서 추가·수정할 수 있습니다.">
            <Select
              value={draft.domain}
              options={domains.map((d) => ({ value: d.id, label: d.label }))}
              // 대분류가 바뀌면 이전 축의 카테고리는 더 이상 유효하지 않다.
              onChange={(domain: string) => set({ domain, category: '' })}
            />
          </Field>
        </Row>

        <Field
          label="하위 카테고리"
          hint="목록에서 고르는 것이 기본입니다. 새 이름은 아래 버튼으로만 만들 수 있습니다."
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={draft.category}
                placeholder="선택하세요"
                options={categoryOptions}
                onChange={(category) => set({ category })}
              />
            </div>
            <button
              type="button"
              onClick={() => void addCategory()}
              className="rounded border border-ink-300 px-3 py-2 text-sm text-ink-700 hover:border-ink-500"
            >
              + 새 카테고리
            </button>
          </div>
        </Field>

        <Field label="한 줄 요약">
          <TextInput value={draft.summary} onChange={(event) => set({ summary: event.target.value })} />
        </Field>

        <Row>
          <Field label="담당팀">
            <TextInput
              value={draft.team ?? ''}
              onChange={(event) => set({ team: event.target.value })}
            />
          </Field>
          <Field label="과제명">
            <TextInput
              value={draft.project ?? ''}
              onChange={(event) => set({ project: event.target.value })}
            />
          </Field>
        </Row>

        {/*
          산업군은 기술을 어디에 놓을지 정하는 값이라 대분류·카테고리 옆이
          제자리다. 전에는 화면 아래쪽 "관련 자료" 구간에 있어서, 도입 정보에
          있던 자유 입력 쪽이 본체처럼 보였다.
        */}
        <Field
          label="산업군"
          required
          hint="산업별 화면과 카탈로그 필터가 이 값으로 연결됩니다. 목록에서만 고를 수 있습니다."
        >
          <IndustryPicker
            industries={industries}
            selected={draft.industries}
            onChange={(next) => set({ industries: next })}
            onAdded={setIndustries}
          />
        </Field>
      </Section>

      <Section
        id="section-business"
        title="해결하는 문제 / 도입 정보"
        description="상세 화면의 첫 문단과 '도입 정보' 블록이 됩니다. 외부 공개하려면 모두 채워야 합니다."
      >
        <Field label="해결하는 문제" required hint="고객이 겪는 문제를 한 문장으로.">
          <TextArea
            rows={2}
            value={draft.business.problem ?? ''}
            onChange={(event) => setBusiness({ problem: event.target.value })}
          />
        </Field>

        {/*
          주요 수요처(target_industries) 입력은 내렸다. 산업군과 결국 같은
          이야기를 두 번 쓰게 만들었고, 구체 도입처는 "해결하는 문제" 문장에
          녹이는 편이 낫다. 값 자체는 지우지 않는다 — 폼이 필드를 빼고
          저장하면 기존 레코드의 값이 조용히 사라지므로, 입력 없이 원래
          값을 그대로 실어 보낸다.
        */}

        <Row>
          <Field label="입력 형식" required>
            <TextInput
              value={draft.business.io?.input ?? ''}
              placeholder="RTSP 영상 스트림"
              onChange={(event) =>
                setBusiness({
                  io: { input: event.target.value, output: draft.business.io?.output ?? '' },
                })
              }
            />
          </Field>
          <Field label="출력 형식" required>
            <TextInput
              value={draft.business.io?.output ?? ''}
              placeholder="이벤트 알림 + 대상 좌표"
              onChange={(event) =>
                setBusiness({
                  io: { input: draft.business.io?.input ?? '', output: event.target.value },
                })
              }
            />
          </Field>
        </Row>

        <Row>
          {/*
            성숙도와 검증 등급은 다른 축이다. 성숙도는 기술이 어디까지 나가
            봤는지(현장·실증·시험 검증·연구)고, 누가 성능을 확인했는지(제3자
            인증·자체 시험)는 아래 검증 등급이 답한다. 인증을 받았다는 이유로
            성숙도를 올려 적으면 두 값이 서로 다른 이야기를 하게 된다.
          */}
          <Field label="성숙도" required hint="적용이 어디까지 갔는지. 인증 여부는 '검증 등급'에 따로 적습니다.">
            <Select
              value={draft.business.maturity ?? ''}
              placeholder="선택하세요"
              options={options(MATURITY_LEVELS, MATURITY_LABELS)}
              onChange={(maturity) => setBusiness({ maturity })}
            />
          </Field>
          <Field
            label="도입 조건 및 제약"
            hint="선택 항목이지만 비어 있으면 목록에 '도입 정보 미비' 경고가 표시됩니다."
          >
            <TagList
              values={draft.business.requirements ?? []}
              placeholder="GPU 1장 기준 4채널 실시간 처리"
              onChange={(requirements) => setBusiness({ requirements })}
            />
          </Field>
        </Row>
      </Section>

      <Section
        id="section-metrics"
        title="성능 지표"
        description="지표가 없는 기술도 있습니다. 비워 두면 상세 화면에서 지표 블록이 생략됩니다."
      >
        {draft.metrics.map((metric, index) => {
          const update = (patch: Partial<MetricDraft>) => {
            const next = [...draft.metrics];
            next[index] = { ...next[index], ...patch };
            set({ metrics: next });
          };

          return (
            <div key={index} className="rounded border border-ink-200 bg-ink-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">지표 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => set({ metrics: draft.metrics.filter((_, i) => i !== index) })}
                  className="text-xs text-[var(--color-signal-fail)] hover:underline"
                >
                  삭제
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <Row>
                  <Field label="지표명" required>
                    <TextInput
                      value={metric.label}
                      placeholder="F1-Score"
                      onChange={(event) => update({ label: event.target.value })}
                    />
                  </Field>
                  <Field
                    label="방향"
                    required
                    error={!metric.direction ? '방향을 선택해야 저장할 수 있습니다.' : undefined}
                    hint="MAE·FID 처럼 낮을수록 좋은 지표는 반드시 '낮을수록 좋음' 으로."
                  >
                    <Select
                      value={metric.direction}
                      placeholder="선택하세요"
                      options={options(METRIC_DIRECTIONS, METRIC_DIRECTION_LABELS)}
                      onChange={(direction) => update({ direction })}
                    />
                  </Field>
                </Row>

                <Row>
                  <Field label="목표값" required>
                    <TextInput
                      value={metric.target}
                      inputMode="decimal"
                      onChange={(event) => update({ target: event.target.value })}
                    />
                  </Field>
                  <Field label="달성값" required>
                    <TextInput
                      value={metric.value}
                      inputMode="decimal"
                      onChange={(event) => update({ value: event.target.value })}
                    />
                  </Field>
                </Row>

                <Field
                  label="조건 단서"
                  hint="목표치에 전제가 있으면 반드시 적으세요. 화면에서 값과 함께 노출됩니다."
                >
                  <TextInput
                    value={metric.condition}
                    placeholder="40px 이상 객체 한정"
                    onChange={(event) => update({ condition: event.target.value })}
                  />
                </Field>

                <Row>
                  <Field label="평가 데이터셋">
                    <TextInput
                      value={metric.dataset}
                      onChange={(event) => update({ dataset: event.target.value })}
                    />
                  </Field>
                  <Field label="출처" hint="예: KISA 인증 / 자체 시험">
                    <TextInput
                      value={metric.source}
                      onChange={(event) => update({ source: event.target.value })}
                    />
                  </Field>
                </Row>

                <Field label="평가 데이터 원본 링크" hint="내부 전용입니다. 외부 화면에 나가지 않습니다.">
                  <TextInput
                    value={metric.dataset_url}
                    onChange={(event) => update({ dataset_url: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            set({
              metrics: [
                ...draft.metrics,
                {
                  label: '',
                  value: '',
                  target: '',
                  direction: '',
                  condition: '',
                  dataset: '',
                  source: '',
                  dataset_url: '',
                },
              ],
            })
          }
          className="w-fit rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500"
        >
          + 지표 추가
        </button>
      </Section>

      {/*
        상세 화면에서는 '기술 구성' 블록이 된다. 관리자 구간 이름과 공개 블록
        이름이 달라 "이 항목은 관리자 어디서 고치나" 를 못 찾는 일이 있었다 —
        이름이 다른 구간마다 어느 블록으로 나가는지 적는다.
      */}
      <Section title="검증 및 기술 구성" description="상세 화면의 '기술 구성' 블록에 표시됩니다. 검증 등급은 배지로도 나갑니다.">
        <Row>
          <Field label="검증 등급" required hint="성능을 누가 확인했는지. 어디까지 적용됐는지는 '성숙도'가 답합니다.">
            <Select
              value={draft.verification.level}
              options={options(VERIFICATION_LEVELS, VERIFICATION_LABELS)}
              onChange={(level) => set({ verification: { ...draft.verification, level } })}
            />
          </Field>
          <Field label="인증 기관" hint="제3자 인증인 경우 기관명 (예: KISA, TTA)">
            <TextInput
              value={draft.verification.body ?? ''}
              onChange={(event) =>
                set({ verification: { ...draft.verification, body: event.target.value } })
              }
            />
          </Field>
        </Row>

        <Row>
          <Field label="개발 구분" required>
            <Select
              value={draft.dev_type}
              options={options(DEV_TYPES, DEV_TYPE_LABELS)}
              onChange={(dev_type) => set({ dev_type })}
            />
          </Field>
          <Field label="베이스 모델">
            <TextInput
              value={draft.base_model ?? ''}
              placeholder="YOLOv8 + ByteTrack"
              onChange={(event) => set({ base_model: event.target.value })}
            />
          </Field>
        </Row>
      </Section>

      <DemoSection draft={draft} set={set} />

      <Section title="미디어">
        <Field label="썸네일 이미지" hint="없으면 카드가 대표 수치를 크게 보여주는 형태로 대체됩니다.">
          <MediaUpload
            techId={draft.id}
            kind="thumbnail"
            accept="image/*"
            value={draft.media.thumbnail ?? ''}
            onChange={(thumbnail) => set({ media: { ...draft.media, thumbnail } })}
          />
        </Field>
        <Field label="카드 루프 영상" hint="자동재생됩니다. 무음이어야 하고 화면 안에 자막을 넣지 마세요.">
          <MediaUpload
            techId={draft.id}
            kind="loop"
            accept="video/*"
            value={draft.media.loop ?? ''}
            onChange={(loop) => set({ media: { ...draft.media, loop } })}
          />
        </Field>
        <Field label="데모 영상" hint="데모 서버가 응답하지 않을 때 이 영상으로 대체됩니다.">
          <MediaUpload
            techId={draft.id}
            kind="video"
            accept="video/*"
            value={draft.media.video ?? ''}
            onChange={(video) => set({ media: { ...draft.media, video } })}
          />
        </Field>
      </Section>

      <Section
        title="관련 자료 및 연계 기술"
        description="상세 화면의 '관련 자료' 블록에 표시됩니다. 자료와 연계 기술이 모두 비면 블록이 생략됩니다."
      >
        <Field
          label="관련 자료"
          hint="이미지와 PDF는 상세 화면에 바로 펼쳐지고, 그 외 파일과 링크는 버튼으로 나갑니다. 업로드가 막힌 망에서는 드라이브에 올리고 공유 링크를 붙여넣으세요 — 형식은 자동으로 알아냅니다."
        >
          <div className="flex flex-col gap-2">
            {draft.resources.map((resource, index) => {
              const update = (patch: Partial<typeof resource>) => {
                const next = [...draft.resources];
                next[index] = { ...next[index], ...patch };
                set({ resources: next });
              };
              return (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <TextInput
                    value={resource.label}
                    placeholder="자료명"
                    onChange={(event) => update({ label: event.target.value })}
                    className="min-w-40 flex-1"
                  />
                  {/* 주소 입력과 파일 업로드를 겸한다. 이미지를 올리면 상세 화면에 펼쳐진다. */}
                  <div className="min-w-52 flex-[2]">
                    <MediaUpload
                      techId={draft.id}
                      kind="resource"
                      accept="image/*,application/pdf"
                      value={resource.url}
                      onChange={(url) => update({ url })}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-ink-600">
                    <input
                      type="checkbox"
                      checked={resource.internal}
                      onChange={(event) => update({ internal: event.target.checked })}
                    />
                    내부 전용
                  </label>
                  <button
                    type="button"
                    onClick={() => set({ resources: draft.resources.filter((_, i) => i !== index) })}
                    className="rounded border border-ink-300 px-2.5 py-2 text-sm text-ink-500 hover:border-ink-500"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() =>
                set({ resources: [...draft.resources, { label: '', url: '', internal: false }] })
              }
              className="w-fit rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500"
            >
              + 자료 추가
            </button>
          </div>
        </Field>

        <Field label="함께 쓰는 기술">
          {otherTechs.length === 0 ? (
            <p className="text-sm text-ink-400">연결할 다른 기술이 아직 없습니다.</p>
          ) : (
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded border border-ink-200 p-2">
              {otherTechs.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={draft.related_tech.includes(item.id)}
                    onChange={(event) =>
                      set({
                        related_tech: event.target.checked
                          ? [...draft.related_tech, item.id]
                          : draft.related_tech.filter((id) => id !== item.id),
                      })
                    }
                  />
                  {item.name}
                </label>
              ))}
            </div>
          )}
        </Field>
      </Section>

      <Section
        title="대외 공개 제한"
        description="정부 과제로 개발한 기술은 외부에 공개하되 일부 항목은 내보낼 수 없습니다."
      >
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.restricted}
            onChange={(event) => set({ restricted: event.target.checked })}
          />
          <span>
            과제 연계 기술입니다
            <span className="mt-1 block text-ink-500">
              켜면 아래 항목이 공개 화면과 공개 API 에서 모두 빠집니다. 공개 범위 설정과는
              별개로 동작합니다.
            </span>
          </span>
        </label>

        {draft.restricted ? (
          <ul className="flex flex-col gap-1 rounded border border-[var(--color-signal-warn)]/30 bg-[var(--color-signal-warn-soft)] px-4 py-3 text-sm text-[var(--color-signal-warn)]">
            {RESTRICTED_FIELDS.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* 저장 막대는 화면에 고정한다. 폼이 길어 하단까지 내려가야 저장할 수 있으면 불편하다. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-ink-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <p className="text-[var(--color-signal-fail)]">{error}</p>
            ) : missingDirection ? (
              <p className="text-[var(--color-signal-fail)]">
                지표 방향을 선택해야 저장할 수 있습니다.
              </p>
            ) : blockedFromPublish ? (
              <p className="text-[var(--color-signal-warn)]">
                외부 공개하려면 다음 항목이 필요합니다 ·{' '}
                {publishIssues.map((issue) => issue.label).join(', ')}
              </p>
            ) : (
              <p className="text-ink-500">{VISIBILITY_HINTS[draft.visibility]}</p>
            )}
          </div>

          {/*
            공개 범위가 곧 저장 버튼이다. 상태를 따로 고르고 저장을 또 누르면
            둘이 어긋난 채로 저장되는 경우가 생긴다.
          */}
          <div className="flex items-center gap-2">
            {/*
              막혔을 때도 버튼은 살려 둔다. 잠가 두면 눌러도 아무 반응이 없어
              고장인지 미완인지 구분이 안 된다. 흐리게만 두고, 누르면 사유를
              말하며 비어 있는 구간으로 데려간다.
            */}
            <button
              type="button"
              disabled={pending}
              onClick={() => void save('draft')}
              className={cn(
                'rounded border border-ink-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-600 disabled:opacity-60',
                missingDirection && 'opacity-60',
              )}
            >
              임시저장
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void save('internal')}
              className={cn(
                'rounded border border-ink-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-600 disabled:opacity-60',
                missingDirection && 'opacity-60',
              )}
            >
              내부 공개
            </button>
            <button
              type="button"
              disabled={pending}
              title={blockReason('link') ?? undefined}
              onClick={() => void save('link')}
              className={cn(
                'rounded border border-ink-400 px-4 py-2 text-sm text-ink-700 hover:border-ink-600 disabled:opacity-60',
                blockReason('link') && 'opacity-60',
              )}
            >
              링크 공개
            </button>
            <button
              type="button"
              disabled={pending}
              title={blockReason('public') ?? undefined}
              onClick={() => void save('public')}
              className={cn(
                'rounded bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 disabled:opacity-60',
                blockReason('public') && 'opacity-60',
              )}
            >
              외부 공개
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 데모 타입별 입력. 분기는 4종뿐이며 여기 한 곳에만 존재한다. */
function DemoSection({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  const demo = draft.demo;

  return (
    <Section id="section-demo" title="데모">
      <Field label="데모 타입" required>
        <Select
          value={demo.type}
          options={options(DEMO_TYPES, DEMO_TYPE_LABELS)}
          onChange={(type) => {
            // 타입이 바뀌면 이전 타입의 설정은 의미가 없으므로 초기화한다.
            if (type === 'api') {
              set({ demo: { type, endpoint: '', api_name: '/predict', input_kind: 'none', samples: [] } });
            } else if (type === 'embed') {
              set({ demo: { type, embed_url: '' } });
            } else if (type === 'video') {
              set({ demo: { type, src: draft.media.video ?? '' } });
            } else {
              set({ demo: { type } });
            }
          }}
        />
      </Field>

      {demo.type === 'api' ? (
        <>
          <Row>
            <Field label="엔드포인트" required hint="내부망 주소입니다. 외부 화면에 노출되지 않습니다.">
              <TextInput
                value={demo.endpoint}
                placeholder="http://10.100.110.102:9999"
                onChange={(event) => set({ demo: { ...demo, endpoint: event.target.value } })}
              />
            </Field>
            <Field label="API 이름">
              <TextInput
                value={demo.api_name}
                placeholder="/predict"
                onChange={(event) => set({ demo: { ...demo, api_name: event.target.value } })}
              />
            </Field>
          </Row>

          <Field label="입력 형태" required>
            <Select
              value={demo.input_kind}
              options={options(INPUT_KINDS, INPUT_KIND_LABELS)}
              onChange={(input_kind) => set({ demo: { ...demo, input_kind } })}
            />
          </Field>

          <Field
            label="샘플 입력"
            required
            hint="최소 1개. 방문자에게 업로드를 먼저 요구하면 이탈하므로 샘플 실행이 기본 동작입니다."
          >
            <div className="flex flex-col gap-2">
              {demo.samples.map((sample, index) => {
                const update = (patch: Partial<typeof sample>) => {
                  const next = [...demo.samples];
                  next[index] = { ...next[index], ...patch };
                  set({ demo: { ...demo, samples: next } });
                };
                return (
                  <div key={index} className="flex flex-wrap gap-2">
                    <TextInput
                      value={sample.label}
                      placeholder="샘플 이름"
                      onChange={(event) => update({ label: event.target.value })}
                      className="min-w-36 flex-1"
                    />
                    {demo.input_kind === 'text_input' ? (
                      <TextInput
                        value={sample.text ?? ''}
                        placeholder="샘플 문구"
                        onChange={(event) => update({ text: event.target.value })}
                        className="min-w-52 flex-1"
                      />
                    ) : (
                      <TextInput
                        value={sample.path ?? ''}
                        placeholder="/samples/example.mp4"
                        onChange={(event) => update({ path: event.target.value })}
                        className="min-w-52 flex-1"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        set({ demo: { ...demo, samples: demo.samples.filter((_, i) => i !== index) } })
                      }
                      className="rounded border border-ink-300 px-2.5 py-2 text-sm text-ink-500 hover:border-ink-500"
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  set({ demo: { ...demo, samples: [...demo.samples, { label: '', path: '' }] } })
                }
                className="w-fit rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500"
              >
                + 샘플 추가
              </button>
            </div>
          </Field>
        </>
      ) : null}

      {demo.type === 'embed' ? (
        <Field
          label="웹앱 주소"
          required
          hint="서버 프록시를 거쳐 표시됩니다. 방문자에게 이 주소가 노출되지 않습니다."
        >
          <TextInput
            value={demo.embed_url}
            placeholder="http://10.100.110.102:22023"
            onChange={(event) => set({ demo: { ...demo, embed_url: event.target.value } })}
          />
        </Field>
      ) : null}

      {demo.type === 'video' ? (
        <Field label="데모 영상 경로" required hint="위 미디어 구간에 올린 영상 경로를 넣으세요.">
          <TextInput
            value={demo.src}
            placeholder="/videos/example.mp4"
            onChange={(event) => set({ demo: { ...demo, src: event.target.value } })}
          />
        </Field>
      ) : null}

      {demo.type === 'metric' ? (
        <Field label="대표 지표" hint="비워 두면 목표를 달성한 첫 지표를 씁니다.">
          <Select
            value={demo.highlight_metric ?? ''}
            placeholder="자동 선택"
            options={draft.metrics
              .filter((metric) => metric.label)
              .map((metric) => ({ value: metric.label, label: metric.label }))}
            onChange={(highlight_metric) => set({ demo: { ...demo, highlight_metric } })}
          />
        </Field>
      ) : null}
    </Section>
  );
}
