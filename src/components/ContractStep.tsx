import type { Estimate, Settings } from '../types';
import { completionDate, formatDate, money, num, unitPriceForScope, type Totals } from '../calc';
import { defaultPaymentTerms } from './PriceStep';

export function ContractStep({ estimate, update, settings, totals }: {
  estimate: Estimate;
  update: (fn: (e: Estimate) => Estimate) => void;
  settings: Settings;
  totals: Totals;
}) {
  const { company } = settings;
  const c = estimate.customer;
  const selectedScope = settings.scopeOptions.filter((o) => estimate.scope[o.id]?.on);
  const unitPrices = selectedScope.filter((o) => o.charge.type === 'perUnit');
  const end = completionDate(estimate.startDate, totals.durationDays);
  const customerLabel = c.type === 'contractor' ? 'General Contractor' : 'Homeowner';
  const terms = settings.contractTerms.split('\n').map((t) => t.trim()).filter(Boolean);
  const shingle = settings.materials.find((m) => m.id === estimate.shingleId && totals.materials.some((l) => l.material.id === m.id));
  const shingleText = shingle ? [shingle.name.replace(/\s*\(.*\)$/, ''), estimate.shingleColor].filter(Boolean).join(' — ') : '';
  const missing = [
    !c.name && 'customer name',
    !c.propertyAddress && 'job address',
    !estimate.startDate && 'start date',
    totals.total <= 0 && 'measurements',
  ].filter(Boolean);

  return (
    <>
      <div className="toolbar no-print">
        <label><input type="checkbox" checked={estimate.showMaterialList} onChange={(e) => update((x) => ({ ...x, showMaterialList: e.target.checked }))} /> Show material list</label>
        <label><input type="checkbox" checked={estimate.showItemizedPrices} onChange={(e) => update((x) => ({ ...x, showItemizedPrices: e.target.checked }))} /> Show itemized prices</label>
        <label>
          Status{' '}
          <select value={estimate.status} onChange={(e) => update((x) => ({ ...x, status: e.target.value as Estimate['status'] }))}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
          </select>
        </label>
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      {missing.length > 0 && <p className="notice no-print">Still missing: {missing.join(', ')}.</p>}

      <article className="contract">
        <header className="contract-head">
          <div>
            {company.logoDataUrl && <img className="logo" src={company.logoDataUrl} alt="" />}
            <h1>{company.name}</h1>
            <div className="muted">
              {company.address && <div>{company.address}</div>}
              {[company.phone, company.email].filter(Boolean).join(' · ')}
              {company.license && <div>{company.license}</div>}
            </div>
          </div>
          <div className="r">
            <h2>Roofing Proposal &amp; Contract</h2>
            <div>No. {estimate.number}</div>
            <div>{formatDate(estimate.updatedAt)}</div>
            {estimate.estimator && <div>Estimator: {estimate.estimator}</div>}
          </div>
        </header>

        <section className="two-col">
          <div>
            <h3>{customerLabel}</h3>
            <div>{c.name || '—'}</div>
            {c.company && <div>{c.company}</div>}
            {c.billingAddress && <div>{c.billingAddress}</div>}
            <div>{[c.phone, c.email].filter(Boolean).join(' · ')}</div>
          </div>
          <div>
            <h3>Job site</h3>
            <div>{c.propertyAddress || '—'}</div>
            <div>
              {num(totals.labor.squares)} squares · {estimate.measurements.pitch}/12 pitch · {estimate.measurements.stories} stor{estimate.measurements.stories === 1 ? 'y' : 'ies'}
            </div>
            {shingle && <div>Shingle: {shingleText}</div>}
          </div>
        </section>

        <section>
          <h3>Scope of work</h3>
          <ol>
            {selectedScope.map((o) => {
              const qty = estimate.scope[o.id]?.qty ?? 0;
              return (
                <li key={o.id}>
                  {o.contractText}
                  {o.id === 'tearoff' && estimate.measurements.layers > 1 && ` (${estimate.measurements.layers} layers)`}
                  {o.charge.type === 'perUnit' && qty > 0 && ` Includes ${qty} ${o.charge.unitLabel ?? 'unit'}${qty === 1 ? '' : 's'}.`}
                </li>
              );
            })}
          </ol>
          {estimate.notes && <p><strong>Notes:</strong> {estimate.notes}</p>}
        </section>

        {estimate.showMaterialList && totals.materials.length > 0 && (
          <section>
            <h3>Materials</h3>
            <table>
              <thead>
                <tr><th>Item</th><th className="r">Qty</th><th>Unit</th>{estimate.showItemizedPrices && <th className="r">Amount</th>}</tr>
              </thead>
              <tbody>
                {totals.materials.filter((l) => l.qty > 0).map((l) => (
                  <tr key={l.material.id}>
                    <td>{l.material.id === shingle?.id && estimate.shingleColor ? `${l.material.name} — ${estimate.shingleColor}` : l.material.name}</td>
                    <td className="r">{l.qty}</td>
                    <td>{l.material.unit}</td>
                    {estimate.showItemizedPrices && <td className="r">{money(l.cost * (1 + settings.pricing.materialTaxPct / 100) * totals.priceFactor)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">Quantities include a {estimate.wastePct}% waste allowance on shingles and underlayment.</p>
          </section>
        )}

        <section>
          <h3>Contract price</h3>
          <table className="kv">
            <tbody>
              {estimate.showItemizedPrices && (
                <>
                  <tr><td>Materials</td><td className="r">{money((totals.materialCost + totals.materialTax) * totals.priceFactor)}</td></tr>
                  <tr><td>Labor</td><td className="r">{money(totals.laborCost * totals.priceFactor)}</td></tr>
                  {totals.charges.map((ch) => (
                    <tr key={ch.option.id}><td>{ch.option.label}</td><td className="r">{money(ch.cost * totals.priceFactor)}</td></tr>
                  ))}
                  {totals.otherCost > 0 && <tr><td>Disposal &amp; job costs</td><td className="r">{money(totals.otherCost * totals.priceFactor)}</td></tr>}
                </>
              )}
              {totals.salesTax > 0 && (
                <>
                  <tr><td>Subtotal</td><td className="r">{money(totals.subtotal)}</td></tr>
                  <tr><td>Tax ({settings.pricing.salesTaxPct}%)</td><td className="r">{money(totals.salesTax)}</td></tr>
                </>
              )}
              <tr className="grand"><td>Total contract price</td><td className="r">{money(totals.total)}</td></tr>
            </tbody>
          </table>
          {unitPrices.length > 0 && (
            <p>
              <strong>Additional unit prices:</strong>{' '}
              {unitPrices.map((o) => `${o.label.replace(/\s*\(.*\)$/, '')}: ${money(unitPriceForScope(o, settings, totals.marginPct))} per ${o.charge.unitLabel ?? 'unit'}`).join('; ')} (including tax).
            </p>
          )}
          <p><strong>Payment:</strong> {estimate.paymentTerms || defaultPaymentTerms(totals, settings.pricing.depositPct)}</p>
        </section>

        <section>
          <h3>Schedule</h3>
          <table className="kv">
            <tbody>
              <tr><td>Estimated start date</td><td className="r">{estimate.startDate ? formatDate(estimate.startDate) : 'To be scheduled'}</td></tr>
              <tr><td>Estimated project length</td><td className="r">{totals.durationDays} working day{totals.durationDays === 1 ? '' : 's'}</td></tr>
              {end && <tr><td>Estimated completion</td><td className="r">{formatDate(end)}</td></tr>}
            </tbody>
          </table>
        </section>

        <section>
          <h3>Warranty</h3>
          <p>{settings.warranty}</p>
          <h3>Terms &amp; conditions</h3>
          <ol className="terms">{terms.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </section>

        <section className="signatures">
          <div>
            <div className="sig-line" />
            <div>{customerLabel} signature</div>
            <div className="sig-line short" />
            <div>Printed name / Date</div>
          </div>
          <div>
            <div className="sig-line" />
            <div>{company.name} representative</div>
            <div className="sig-line short" />
            <div>Printed name / Date</div>
          </div>
        </section>
      </article>
    </>
  );
}
