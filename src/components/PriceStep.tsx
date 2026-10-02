import type { Estimate, Settings } from '../types';
import { completionDate, formatDate, money, num, type Totals } from '../calc';
import { Card, Field, NumberInput, TextArea } from './ui';

export function PriceStep({ estimate, update, settings, totals }: {
  estimate: Estimate;
  update: (fn: (e: Estimate) => Estimate) => void;
  settings: Settings;
  totals: Totals;
}) {
  const { labor } = totals;
  const ls = settings.labor;
  const p = settings.pricing;
  const end = completionDate(estimate.startDate, totals.durationDays);
  const lowMargin = totals.marginPct < p.minMarginPct;

  const toggleCrew = (id: string, on: boolean) =>
    update((x) => ({ ...x, crewIds: on ? [...x.crewIds, id] : x.crewIds.filter((c) => c !== id) }));
  const setJobCost = (id: string, patch: { qty?: number; unitCost?: number } | null) =>
    update((x) => {
      const next = { ...x.jobCosts };
      if (patch === null) delete next[id];
      else {
        const line = totals.jobCosts.find((l) => l.item.id === id)!;
        next[id] = { ...(next[id] ?? { qty: line.qty }), ...patch };
      }
      return { ...x, jobCosts: next };
    });

  return (
    <div className="split">
      <div>
        <Card title="Labor">
          <div className="grid">
            <Field label="Hours per square" hint={estimate.hoursPerSquare !== undefined ? `Default ${ls.hoursPerSquare}` : 'From settings'}>
              <NumberInput value={labor.hoursPerSquare} onChange={(v) => update((x) => ({ ...x, hoursPerSquare: v > 0 ? v : undefined }))} />
            </Field>
          </div>
          <h3>Crew on this job</h3>
          <div className="checks">
            {ls.crew.map((c) => (
              <label key={c.id}>
                <input type="checkbox" checked={estimate.crewIds.includes(c.id)} onChange={(e) => toggleCrew(c.id, e.target.checked)} />
                {c.name} <span className="muted small">{money(c.weeklyCost / (ls.hoursPerWeek || 40))}/hr</span>
              </label>
            ))}
          </div>
          <table className="kv">
            <tbody>
              <tr><td>Roof squares</td><td className="r">{num(labor.squares)}</td></tr>
              <tr><td>Install ({labor.hoursPerSquare} hrs/sq)</td><td className="r">{num(labor.installHours, 1)} hrs</td></tr>
              {labor.extraLayerHours > 0 && (
                <tr><td>Extra tear-off layers ({estimate.measurements.layers - 1} × {ls.extraLayerHoursPerSquare} hrs/sq)</td><td className="r">{num(labor.extraLayerHours, 1)} hrs</td></tr>
              )}
              {labor.pitchMultiplier !== 1 && <tr><td>Steep pitch ({estimate.measurements.pitch}/12)</td><td className="r">× {labor.pitchMultiplier}</td></tr>}
              {labor.storyMultiplier !== 1 && <tr><td>Stories ({estimate.measurements.stories})</td><td className="r">× {num(labor.storyMultiplier, 2)}</td></tr>}
              <tr className="strong"><td>Total labor hours</td><td className="r">{num(labor.totalHours, 1)} hrs</td></tr>
              <tr><td>Blended crew rate ({labor.crew.length} people)</td><td className="r">{money(labor.blendedRate)}/hr</td></tr>
              <tr className="strong"><td>Labor cost</td><td className="r">{money(labor.cost)}</td></tr>
            </tbody>
          </table>
          {labor.crew.length === 0 && <p className="notice">Select at least one crew member to price labor.</p>}
        </Card>

        <Card title="Other job costs">
          <div className="table-wrap">
            <table className="edit">
              <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Each</th><th className="r">Total</th><th /></tr></thead>
              <tbody>
                {totals.jobCosts.map((l) => (
                  <tr key={l.item.id}>
                    <td>{l.item.name}<span className="muted small block">{l.item.description}{l.item.squaresPerUnit ? ` · 1 ${l.item.unitLabel} per ${l.item.squaresPerUnit} sq` : ''}</span></td>
                    <td className="r"><NumberInput value={l.qty} min={0} onChange={(v) => setJobCost(l.item.id, { qty: v })} /></td>
                    <td className="r"><NumberInput value={l.unitCost} min={0} onChange={(v) => setJobCost(l.item.id, { unitCost: v })} /></td>
                    <td className="r">{money(l.cost)}</td>
                    <td>{!l.isDefault && <button className="link" title="Reset to default" onClick={() => setJobCost(l.item.id, null)}>↺</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Schedule">
          <div className="grid">
            <Field label="Start date">
              <input type="date" value={estimate.startDate} onChange={(e) => update((x) => ({ ...x, startDate: e.target.value }))} />
            </Field>
            <Field
              label="Project length (working days)"
              hint={`Calculated: ${labor.crewDays} day${labor.crewDays === 1 ? '' : 's'} for ${labor.crew.length} roofers at ${ls.hoursPerDay} hrs/day`}
            >
              <NumberInput
                value={totals.durationDays}
                step={1}
                min={1}
                onChange={(v) => update((x) => ({ ...x, durationDaysOverride: v > 0 ? v : undefined }))}
              />
            </Field>
            {estimate.durationDaysOverride !== undefined && (
              <button className="secondary align-end" onClick={() => update((x) => ({ ...x, durationDaysOverride: undefined }))}>
                Use calculated
              </button>
            )}
          </div>
          {end && <p>Estimated completion: <strong>{formatDate(end)}</strong> <span className="muted">(weekdays only, weather permitting)</span></p>}
        </Card>
      </div>

      <div>
        <Card title="Price summary">
          <table className="kv">
            <tbody>
              <tr><td>Materials</td><td className="r">{money(totals.materialCost)}</td></tr>
              {totals.materialTax > 0 && <tr><td>Supplier tax ({p.materialTaxPct}%)</td><td className="r">{money(totals.materialTax)}</td></tr>}
              <tr><td>Labor</td><td className="r">{money(totals.laborCost)}</td></tr>
              {totals.charges.map((c) => (
                <tr key={c.option.id}><td>{c.option.label}{c.option.charge.type !== 'fixed' && ` (${num(c.qty)})`}</td><td className="r">{money(c.cost)}</td></tr>
              ))}
              {totals.otherCost > 0 && <tr><td>Other job costs</td><td className="r">{money(totals.otherCost)}</td></tr>}
              <tr className="strong"><td>Direct job cost</td><td className="r">{money(totals.directCost)}</td></tr>
              {totals.overhead > 0 && <tr><td>Indirect overhead ({p.overheadPct}%)</td><td className="r">{money(totals.overhead)}</td></tr>}
              <tr>
                <td>
                  Target gross profit margin{' '}
                  <span className="inline-input">
                    <NumberInput value={totals.marginPct} onChange={(v) => update((x) => ({ ...x, grossMarginPct: v }))} />%
                  </span>
                  {estimate.grossMarginPct !== undefined && (
                    <button className="link" onClick={() => update((x) => ({ ...x, grossMarginPct: undefined }))}>↺</button>
                  )}
                  {lowMargin && <span className="warn block">Below minimum GP of {p.minMarginPct}%</span>}
                </td>
                <td className="r">{money(totals.grossProfit)}</td>
              </tr>
              <tr className="strong"><td>Subtotal bid price</td><td className="r">{money(totals.subtotal)}</td></tr>
              {totals.salesTax > 0 && <tr><td>Tax ({p.salesTaxPct}%)</td><td className="r">{money(totals.salesTax)}</td></tr>}
              <tr className="grand"><td>Total bid</td><td className="r">{money(totals.total)}</td></tr>
              <tr><td>Per square</td><td className="r">{money(totals.pricePerSquare)}</td></tr>
              <tr><td>Daily profit ({totals.durationDays} days)</td><td className="r">{money(totals.dailyProfit)}</td></tr>
              <tr><td>Deposit ({p.depositPct}%)</td><td className="r">{money(totals.deposit)}</td></tr>
              <tr><td>Balance on completion</td><td className="r">{money(totals.balance)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Payment terms">
          <TextArea
            label="Shown on the contract"
            rows={3}
            value={estimate.paymentTerms}
            hint={`Leave blank to use: ${defaultPaymentTerms(totals, p.depositPct)}`}
            onChange={(v) => update((x) => ({ ...x, paymentTerms: v }))}
          />
        </Card>
      </div>
    </div>
  );
}

export function defaultPaymentTerms(totals: Totals, depositPct: number): string {
  return `${depositPct}% deposit of ${money(totals.deposit)} due at signing to order materials. Balance of ${money(totals.balance)} due upon completion.`;
}
