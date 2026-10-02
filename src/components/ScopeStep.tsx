import type { Estimate, Settings } from '../types';
import { isShingleProduct, money, unitPriceForScope } from '../calc';
import { Card, Field, NumberInput, TextField } from './ui';

export function ScopeStep({ estimate, update, settings }: {
  estimate: Estimate;
  update: (fn: (e: Estimate) => Estimate) => void;
  settings: Settings;
}) {
  const setScope = (id: string, patch: Partial<{ on: boolean; qty: number }>) =>
    update((e) => ({ ...e, scope: { ...e.scope, [id]: { ...(e.scope[id] ?? { on: false, qty: 0 }), ...patch } } }));

  const shingles = settings.materials.filter(isShingleProduct);
  const margin = estimate.grossMarginPct ?? settings.pricing.grossMarginPct;

  return (
    <>
    <Card title="Shingle">
      <div className="grid">
        <Field label="Shingle product">
          <select value={estimate.shingleId ?? ''} onChange={(e) => update((x) => ({ ...x, shingleId: e.target.value }))}>
            {shingles.map((m) => <option key={m.id} value={m.id}>{m.name} — {money(m.unitCost)}/{m.unit}</option>)}
          </select>
        </Field>
        <TextField label="Color" value={estimate.shingleColor} placeholder="e.g. Moire Black" onChange={(v) => update((x) => ({ ...x, shingleColor: v }))} />
      </div>
    </Card>
    <Card title="Scope of work" actions={<span className="muted">Selected items go into the contract and drive the material list.</span>}>
      <ul className="scope-list">
        {settings.scopeOptions.map((o) => {
          const sel = estimate.scope[o.id] ?? { on: false, qty: 0 };
          const linked = settings.materials.filter((m) => o.materialIds.includes(m.id));
          return (
            <li key={o.id} className={sel.on ? 'on' : ''}>
              <label className="scope-main">
                <input type="checkbox" checked={sel.on} onChange={(e) => setScope(o.id, { on: e.target.checked })} />
                <span>
                  <strong>{o.label}</strong>
                  <span className="muted block">{o.contractText}</span>
                  {linked.length > 0 && <span className="muted small block">Materials: {linked.map((m) => m.name).join(', ')}</span>}
                </span>
              </label>
              <div className="scope-charge">
                {o.charge.type === 'fixed' && <span>{money(o.charge.amount)}</span>}
                {o.charge.type === 'perSquare' && <span>{money(o.charge.amount)} / sq</span>}
                {o.charge.type === 'perUnit' && sel.on && (
                  <span className="qty">
                    <NumberInput value={sel.qty} step={1} min={0} onChange={(v) => setScope(o.id, { qty: v })} />
                    {o.charge.unitLabel ?? 'units'} @ {money(unitPriceForScope(o, settings, margin))}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
    </>
  );
}
