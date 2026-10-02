import type { Estimate, MaterialOverride, Settings } from '../types';
import { BASIS_LABELS, isMaterialInScope, materialLines, money, num } from '../calc';
import { exportPriceList } from '../csv';
import { download } from '../files';
import { Card } from './ui';

export function MaterialsStep({ estimate, update, settings }: {
  estimate: Estimate;
  update: (fn: (e: Estimate) => Estimate) => void;
  settings: Settings;
}) {
  const lines = materialLines(estimate, settings);
  const total = lines.reduce((s, l) => s + l.cost, 0);
  const tax = Math.round(total * settings.pricing.materialTaxPct) / 100;
  const setOverride = (id: string, patch: MaterialOverride | null) =>
    update((e) => {
      const next = { ...e.materialOverrides };
      if (patch === null) delete next[id];
      else next[id] = { ...next[id], ...patch };
      return { ...e, materialOverrides: next };
    });

  const excluded = settings.materials.filter(
    (m) => isMaterialInScope(m, estimate, settings) && estimate.materialOverrides[m.id]?.off,
  );
  const onList = new Set(lines.map((l) => l.material.id));
  const addable = settings.materials.filter((m) => !onList.has(m.id) && !excluded.includes(m));
  const categories = [...new Set(addable.map((m) => m.category))];

  const exportOrder = () => {
    const rows = ['Material,Quantity,Unit,Unit cost,Total'];
    for (const l of lines) rows.push(`"${l.material.name}",${l.qty},${l.material.unit},${l.material.unitCost},${l.cost}`);
    download(`material-order-${estimate.number}.csv`, rows.join('\n'), 'text/csv');
  };

  return (
    <Card
      title="Material list"
      actions={<>
        <button className="secondary" onClick={exportOrder}>Export order (CSV)</button>
        <button className="secondary" onClick={() => window.print()}>Print</button>
      </>}
    >
      <p className="muted">
        Quantities are calculated from the measurements, waste and the coverage in your price list.
        Type a quantity to override it; clear the box to go back to the calculated amount.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th><th>Based on</th><th className="r">Measure</th><th className="r">Waste</th>
              <th className="r">Qty</th><th>Unit</th><th className="r">Unit cost</th><th className="r">Total</th><th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.material.id}>
                <td>{l.material.name}</td>
                <td className="muted small">{BASIS_LABELS[l.material.basis]}{l.material.basis !== 'manual' && ` ÷ ${l.material.coverage}/${l.material.unit}`}</td>
                <td className="r">{l.material.basis === 'manual' ? '—' : num(l.measure, 1)}</td>
                <td className="r">{l.wastePct ? `${l.wastePct}%` : '—'}</td>
                <td className="r qty-cell">
                  <input
                    type="number"
                    className={l.manual ? 'overridden' : ''}
                    value={l.qty}
                    min={0}
                    onChange={(e) => setOverride(l.material.id, { qty: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </td>
                <td>{l.material.unit}</td>
                <td className="r">{money(l.material.unitCost)}</td>
                <td className="r">{money(l.cost)}</td>
                <td className="no-print">
                  {l.manual && <button className="link" title="Use calculated quantity" onClick={() => setOverride(l.material.id, { qty: undefined })}>↺</button>}
                  <button className="link danger" title="Remove from this job" onClick={() => setOverride(l.material.id, { off: true, add: false })}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={7} className="r">Subtotal</td><td className="r">{money(total)}</td><td /></tr>
            <tr><td colSpan={7} className="r">Supplier tax ({settings.pricing.materialTaxPct}%)</td><td className="r">{money(tax)}</td><td /></tr>
            <tr><td colSpan={7} className="r"><strong>Material total</strong></td><td className="r"><strong>{money(total + tax)}</strong></td><td /></tr>
          </tfoot>
        </table>
      </div>
      {lines.length === 0 && <p className="notice">Enter measurements and select scope items to build the list.</p>}
      {excluded.length > 0 && (
        <p className="muted no-print">
          Removed: {excluded.map((m) => (
            <button key={m.id} className="chip" onClick={() => setOverride(m.id, { off: false })}>+ {m.name}</button>
          ))}
        </p>
      )}
      <div className="add-row no-print">
        <select
          value=""
          onChange={(e) => e.target.value && setOverride(e.target.value, { add: true, off: false })}
        >
          <option value="">+ Add an item from the price list…</option>
          {categories.map((c) => (
            <optgroup key={c} label={c}>
              {addable.filter((m) => m.category === c).map((m) => <option key={m.id} value={m.id}>{m.name} — {money(m.unitCost)}/{m.unit}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <p className="muted small no-print">
        Missing an item? Add it under Settings → Price List. <button className="link" onClick={() => download('price-list.csv', exportPriceList(settings.materials), 'text/csv')}>Download price list</button>
      </p>
    </Card>
  );
}
