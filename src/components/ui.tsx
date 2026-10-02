import type { ReactNode } from 'react';

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function NumberInput({ value, onChange, step = 'any', min, placeholder }: {
  value: number | undefined;
  onChange: (v: number) => void;
  step?: number | 'any';
  min?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value === undefined || Number.isNaN(value) ? '' : value}
      step={step}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
    />
  );
}

export function NumberField(props: { label: string; hint?: string } & Parameters<typeof NumberInput>[0]) {
  const { label, hint, ...rest } = props;
  return (
    <Field label={label} hint={hint}>
      <NumberInput {...rest} />
    </Field>
  );
}

export function TextField({ label, value, onChange, hint, type = 'text', wide, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  wide?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} wide={wide}>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function TextArea({ label, value, onChange, rows = 4, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint} wide>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
