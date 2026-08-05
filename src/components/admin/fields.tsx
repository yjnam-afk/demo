'use client';

/**
 * 관리자 폼의 입력 부품.
 *
 * 고정 선택지는 Select, 자유 입력은 TextInput/TextArea/TagList 로 나눈다.
 * 이 구분이 곧 "무엇을 드롭다운으로 강제할 것인가" 규칙의 구현이므로,
 * 선택지가 정해진 항목에 TextInput 을 쓰지 않는다.
 */

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-ink-700">
        {label}
        {required ? <span className="text-[var(--color-signal-fail)]">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-[var(--color-signal-fail)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass =
  'rounded border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-ink-600 focus:outline-none disabled:bg-ink-100 disabled:text-ink-500';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: T | '';
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      className={inputClass}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** 자유 입력 목록 — 산업 태그, 도입 조건 같은 문자열 배열 */
export function TagList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <TextInput
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            className="rounded border border-ink-300 px-2.5 text-sm text-ink-500 hover:border-ink-500"
            aria-label="삭제"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="w-fit rounded border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-500"
      >
        + 추가
      </button>
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  /** 제목 줄 오른쪽에 붙는 조작 (순서 변경·삭제 등) */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-300 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
