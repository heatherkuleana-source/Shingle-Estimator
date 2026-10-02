import { useState } from 'react';
import type { CrewMember, Estimate, JobCostItem, Material, QuantityBasis, ScopeOption, Settings } from '../types';
import { BASIS_LABELS, money } from '../calc';
import { exportPriceList, importPriceList } from '../csv';
import { defaultSettings } from '../defaults';
import { download, imageToDataUrl, readAsText } from '../files';
import { Card, Field, NumberField, NumberInput, TextArea, TextField } from './ui';

type Tab = 'prices' | 'labor' | 'scope' | 'company' | 'backup';
type SetSettings = (fn: (s: Settings) => Settings) => void;

export function SettingsView({ settings, setSettings, estimates, setEstimates }: {
  settings: Settings;
  setSettings: SetSettings;
  estimates: Estimate[];
  setEstimates: (e: Estimate[]) => void;
}) {
  const [tab, setTab] = useState<Tab>('prices');
  const tabs: [Tab, string][] = [
    ['prices', 'Price List'], ['labor', 'Labor & Pricing'], ['scope', 'Scope Options'], ['company', 'Company & Contract'], ['backup', 'Backup'],
  ];
  return (
    <>
      <nav className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {tab === 'prices' && <PriceList settings={settings} setSettings={setSettings} />}
      {tab === 'labor' && <LaborPricing settings={settings} setSettings={setSettings} />}
      {tab === 'scope' && <ScopeOptions settings={settings} setSettings={setSettings} />}
      {tab === 'company' && <CompanyContract settings={settings} setSettings={setSettings} />}
      {tab === 'backup' && <Backup settings={settings} setSettings={setSettings} estimates={estimates} setEstimates={setEstimates} />}
    </>
  );
}

function PriceList({ settings, setSettings }: { settings: Settings; setSettings: SetSettings }) {
  const [msg, setMsg] = useState('');
  const setMat = (id: string, patch: Partial<Material>) =>
    setSettings((s) => ({ ...s, materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const remove = (id: string) =>
    setSettings((s) => ({
      ...s,
      materials: s.materials.filter((m) => m.id !== id),
      scopeOptions: s.scopeOptions.map((o) => ({ ...o, materialIds: o.materialIds.filter((x) => x !== id) })),
    }));
  const add = () =>
    setSettings((s) => ({
      ...s,
      materials: [...s.materials, { id: `item-${Date.now()}`, name: 'New item', category: 'Other', unit: 'each', unitCost: 0, basis: 'manual', coverage: 1 }],
    }));
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const r = importPriceList(await readAsText(file), settings.materials);
    setSettings((s) => ({ ...s, materials: r.materials }));
    setMsg(`Updated ${r.updated}, added ${r.added}.${r.skipped.length ? ` Skipped: ${r.skipped.join('; ')}` : ''}`);
  };

  return (
    <Card
      title="Material price list"
      actions={<>
        <label className="button secondary">Import CSV<input hidden type="file" accept=".csv,text/csv" onChange={(e) => onImport(e.target.files?.[0])} /></label>
        <button className="secondary" onClick={() => download('price-list.csv', exportPriceList(settings.materials), 'text/csv')}>Export CSV</button>
        <button onClick={add}>+ Add item</button>
      </>}
    >
      <p className="muted">
        Loaded from your 7/27 material cost sheet. Edit prices here, or import a CSV with columns <code>name, unit, cost</code> (optional: <code>category, basis, coverage, waste</code>).
        Matching names update the price; new names are added. <strong>Coverage</strong> is how much one unit covers in the &ldquo;based on&rdquo; measure (e.g. 33.3 sq ft per shingle bundle, 10 LF per drip edge stick).
        Leave waste blank to use the estimate&apos;s waste % for area items. Items are put on an estimate by the scope options they&apos;re linked to (Scope Options tab), by &ldquo;Always&rdquo;, or by adding them on the Materials step.
      </p>
      {msg && <p className="notice">{msg}</p>}
      <div className="table-wrap">
        <table className="edit">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Unit</th><th className="r">Cost</th><th>Based on</th><th className="r">Coverage</th><th className="r">Waste %</th><th title="Put on every estimate">Always</th><th /></tr>
          </thead>
          <tbody>
            {settings.materials.map((m) => (
              <tr key={m.id}>
                <td><input value={m.name} onChange={(e) => setMat(m.id, { name: e.target.value })} /></td>
                <td><input value={m.category} onChange={(e) => setMat(m.id, { category: e.target.value })} /></td>
                <td><input className="short" value={m.unit} onChange={(e) => setMat(m.id, { unit: e.target.value })} /></td>
                <td><NumberInput value={m.unitCost} min={0} onChange={(v) => setMat(m.id, { unitCost: v })} /></td>
                <td>
                  <select value={m.basis} onChange={(e) => setMat(m.id, { basis: e.target.value as QuantityBasis })}>
                    {Object.entries(BASIS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td><NumberInput value={m.coverage} min={0} onChange={(v) => setMat(m.id, { coverage: v })} /></td>
                <td>
                  <input
                    type="number"
                    value={m.wastePct ?? ''}
                    placeholder="auto"
                    onChange={(e) => setMat(m.id, { wastePct: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </td>
                <td><input type="checkbox" checked={!!m.alwaysInclude} onChange={(e) => setMat(m.id, { alwaysInclude: e.target.checked })} /></td>
                <td><button className="link danger" title="Delete" onClick={() => remove(m.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LaborPricing({ settings, setSettings }: { settings: Settings; setSettings: SetSettings }) {
  const l = settings.labor;
  const p = settings.pricing;
  const setL = (patch: Partial<Settings['labor']>) => setSettings((s) => ({ ...s, labor: { ...s.labor, ...patch } }));
  const setP = (patch: Partial<Settings['pricing']>) => setSettings((s) => ({ ...s, pricing: { ...s.pricing, ...patch } }));
  const setTier = (i: number, patch: Partial<{ minPitch: number; multiplier: number }>) =>
    setL({ pitchMultipliers: l.pitchMultipliers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setCrew = (id: string, patch: Partial<CrewMember>) => setL({ crew: l.crew.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const setJob = (id: string, patch: Partial<JobCostItem>) =>
    setSettings((s) => ({ ...s, jobCosts: s.jobCosts.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));
  return (
    <>
      <div className="split">
        <Card title="Labor">
          <div className="grid">
            <NumberField label="Install hours per square" value={l.hoursPerSquare} onChange={(v) => setL({ hoursPerSquare: v })} />
            <NumberField label="Hours per work week" hint="Turns weekly cost into an hourly rate" value={l.hoursPerWeek} onChange={(v) => setL({ hoursPerWeek: v })} />
            <NumberField label="Hours per work day" value={l.hoursPerDay} onChange={(v) => setL({ hoursPerDay: v })} />
            <NumberField label="Extra hrs/sq per additional layer" hint="Tear-off of 2nd, 3rd layer" value={l.extraLayerHoursPerSquare} onChange={(v) => setL({ extraLayerHoursPerSquare: v })} />
            <NumberField label="Extra % per story above 1st" value={l.extraStoryPct} onChange={(v) => setL({ extraStoryPct: v })} />
          </div>
          <h3>Crew</h3>
          <table className="edit">
            <thead><tr><th>Name / role</th><th className="r">Weekly cost</th><th className="r">Hourly</th><th>Default crew</th><th /></tr></thead>
            <tbody>
              {l.crew.map((c) => (
                <tr key={c.id}>
                  <td><input value={c.name} onChange={(e) => setCrew(c.id, { name: e.target.value })} /></td>
                  <td><NumberInput value={c.weeklyCost} onChange={(v) => setCrew(c.id, { weeklyCost: v })} /></td>
                  <td className="r">{money(c.weeklyCost / (l.hoursPerWeek || 40))}</td>
                  <td><input type="checkbox" checked={c.defaultOnCrew} onChange={(e) => setCrew(c.id, { defaultOnCrew: e.target.checked })} /></td>
                  <td><button className="link danger" onClick={() => setL({ crew: l.crew.filter((x) => x.id !== c.id) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="secondary" onClick={() => setL({ crew: [...l.crew, { id: `crew-${Date.now()}`, name: 'New roofer', weeklyCost: 1500, defaultOnCrew: false }] })}>+ Add crew member</button>
          <h3>Steep-pitch multipliers</h3>
          <table className="edit">
            <thead><tr><th>From pitch (/12)</th><th>Labor ×</th><th /></tr></thead>
            <tbody>
              {l.pitchMultipliers.map((t, i) => (
                <tr key={i}>
                  <td><NumberInput value={t.minPitch} onChange={(v) => setTier(i, { minPitch: v })} /></td>
                  <td><NumberInput value={t.multiplier} onChange={(v) => setTier(i, { multiplier: v })} /></td>
                  <td><button className="link danger" onClick={() => setL({ pitchMultipliers: l.pitchMultipliers.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="secondary" onClick={() => setL({ pitchMultipliers: [...l.pitchMultipliers, { minPitch: 14, multiplier: 1.75 }] })}>+ Add tier</button>
        </Card>
        <Card title="Pricing">
          <div className="grid">
            <NumberField label="Supplier tax on materials (%)" value={p.materialTaxPct} onChange={(v) => setP({ materialTaxPct: v })} />
            <NumberField label="Indirect overhead (%)" hint="Added to direct cost; 0 if your margin covers it" value={p.overheadPct} onChange={(v) => setP({ overheadPct: v })} />
            <NumberField label="Target gross profit margin (%)" hint="Bid = cost ÷ (1 − margin)" value={p.grossMarginPct} onChange={(v) => setP({ grossMarginPct: v })} />
            <NumberField label="Minimum GP (%)" hint="Warns when a bid is below this" value={p.minMarginPct} onChange={(v) => setP({ minMarginPct: v })} />
            <NumberField label="Tax on bid (%)" hint="e.g. GET 4.712%" value={p.salesTaxPct} onChange={(v) => setP({ salesTaxPct: v })} />
            <NumberField label="Deposit (%)" value={p.depositPct} onChange={(v) => setP({ depositPct: v })} />
          </div>
        </Card>
      </div>
      <Card
        title="Other job costs"
        actions={<button className="secondary" onClick={() => setSettings((s) => ({ ...s, jobCosts: [...s.jobCosts, { id: `cost-${Date.now()}`, name: 'New cost', description: '', unitCost: 0, unitLabel: 'each', defaultQty: 0 }] }))}>+ Add cost</button>}
      >
        <p className="muted">Dump runs, landfill, equipment, per diem and similar costs. &ldquo;Squares per unit&rdquo; sets the quantity automatically from roof size (e.g. one landfill load per 8 squares).</p>
        <div className="table-wrap">
          <table className="edit">
            <thead><tr><th>Name</th><th>Description</th><th className="r">Cost each</th><th>Unit</th><th className="r">Squares per unit</th><th className="r">Default qty</th><th /></tr></thead>
            <tbody>
              {settings.jobCosts.map((j) => (
                <tr key={j.id}>
                  <td><input value={j.name} onChange={(e) => setJob(j.id, { name: e.target.value })} /></td>
                  <td><input value={j.description} onChange={(e) => setJob(j.id, { description: e.target.value })} /></td>
                  <td><NumberInput value={j.unitCost} onChange={(v) => setJob(j.id, { unitCost: v })} /></td>
                  <td><input className="short" value={j.unitLabel} onChange={(e) => setJob(j.id, { unitLabel: e.target.value })} /></td>
                  <td>
                    <input type="number" value={j.squaresPerUnit ?? ''} placeholder="—" onChange={(e) => setJob(j.id, { squaresPerUnit: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  </td>
                  <td><NumberInput value={j.defaultQty} onChange={(v) => setJob(j.id, { defaultQty: v })} /></td>
                  <td><button className="link danger" onClick={() => setSettings((s) => ({ ...s, jobCosts: s.jobCosts.filter((x) => x.id !== j.id) }))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ScopeOptions({ settings, setSettings }: { settings: Settings; setSettings: SetSettings }) {
  const setOpt = (id: string, patch: Partial<ScopeOption>) =>
    setSettings((s) => ({ ...s, scopeOptions: s.scopeOptions.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const move = (i: number, d: number) =>
    setSettings((s) => {
      const list = [...s.scopeOptions];
      const j = i + d;
      if (j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...s, scopeOptions: list };
    });
  const add = () =>
    setSettings((s) => ({
      ...s,
      scopeOptions: [...s.scopeOptions, {
        id: `scope-${Date.now()}`, label: 'New scope item', contractText: '', defaultOn: false, materialIds: [], charge: { type: 'none', amount: 0 },
      }],
    }));
  return (
    <Card title="Scope of work options" actions={<button onClick={add}>+ Add option</button>}>
      <p className="muted">These are the checkboxes on each estimate. Linked materials are only ordered when the item is selected. Charges are added to job cost before overhead &amp; profit.</p>
      {settings.scopeOptions.map((o, i) => (
        <details key={o.id} className="scope-edit">
          <summary>
            <span>{o.label}</span>
            <span className="actions">
              <button className="link" onClick={(e) => { e.preventDefault(); move(i, -1); }}>↑</button>
              <button className="link" onClick={(e) => { e.preventDefault(); move(i, 1); }}>↓</button>
            </span>
          </summary>
          <div className="grid">
            <TextField label="Label" value={o.label} onChange={(v) => setOpt(o.id, { label: v })} />
            <Field label="Selected by default">
              <input type="checkbox" checked={o.defaultOn} onChange={(e) => setOpt(o.id, { defaultOn: e.target.checked })} />
            </Field>
            <TextArea label="Contract wording" rows={2} value={o.contractText} onChange={(v) => setOpt(o.id, { contractText: v })} />
            <Field label="Extra charge">
              <select value={o.charge.type} onChange={(e) => setOpt(o.id, { charge: { ...o.charge, type: e.target.value as ScopeOption['charge']['type'] } })}>
                <option value="none">None</option>
                <option value="fixed">Flat amount</option>
                <option value="perSquare">Per square</option>
                <option value="perUnit">Per unit (qty on estimate)</option>
              </select>
            </Field>
            {o.charge.type !== 'none' && (
              <NumberField label="Amount ($, your cost)" value={o.charge.amount} onChange={(v) => setOpt(o.id, { charge: { ...o.charge, amount: v } })} />
            )}
            {o.charge.type === 'perUnit' && (
              <TextField label="Unit name" value={o.charge.unitLabel ?? ''} onChange={(v) => setOpt(o.id, { charge: { ...o.charge, unitLabel: v } })} />
            )}
          </div>
          <Field label="Linked materials" wide>
            <div className="checks">
              {settings.materials.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={o.materialIds.includes(m.id)}
                    onChange={(e) => setOpt(o.id, { materialIds: e.target.checked ? [...o.materialIds, m.id] : o.materialIds.filter((x) => x !== m.id) })}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </Field>
          <button className="link danger" onClick={() => setSettings((s) => ({ ...s, scopeOptions: s.scopeOptions.filter((x) => x.id !== o.id) }))}>Delete option</button>
        </details>
      ))}
    </Card>
  );
}

function CompanyContract({ settings, setSettings }: { settings: Settings; setSettings: SetSettings }) {
  const c = settings.company;
  const setC = (patch: Partial<Settings['company']>) => setSettings((s) => ({ ...s, company: { ...s.company, ...patch } }));
  return (
    <div className="split">
      <Card title="Company">
        <div className="grid">
          <TextField label="Company name" value={c.name} onChange={(v) => setC({ name: v })} />
          <TextField label="License / registration" value={c.license} onChange={(v) => setC({ license: v })} />
          <TextField label="Address" wide value={c.address} onChange={(v) => setC({ address: v })} />
          <TextField label="Phone" value={c.phone} onChange={(v) => setC({ phone: v })} />
          <TextField label="Email" value={c.email} onChange={(v) => setC({ email: v })} />
          <Field label="Logo" wide>
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setC({ logoDataUrl: await imageToDataUrl(f) }); }} />
            {c.logoDataUrl && <span><img className="logo" src={c.logoDataUrl} alt="" /> <button className="link danger" onClick={() => setC({ logoDataUrl: undefined })}>Remove</button></span>}
          </Field>
        </div>
      </Card>
      <Card title="Contract text">
        <TextArea label="Warranty" rows={3} value={settings.warranty} onChange={(v) => setSettings((s) => ({ ...s, warranty: v }))} />
        <TextArea
          label="Terms & conditions"
          hint="One term per line. Have these reviewed for your state's requirements."
          rows={12}
          value={settings.contractTerms}
          onChange={(v) => setSettings((s) => ({ ...s, contractTerms: v }))}
        />
      </Card>
    </div>
  );
}

function Backup({ settings, setSettings, estimates, setEstimates }: {
  settings: Settings;
  setSettings: SetSettings;
  estimates: Estimate[];
  setEstimates: (e: Estimate[]) => void;
}) {
  const [msg, setMsg] = useState('');
  const onRestore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await readAsText(file));
      if (!data.settings || !Array.isArray(data.estimates)) throw new Error('Not a Shingle Estimator backup file.');
      setSettings(() => data.settings);
      setEstimates(data.estimates);
      setMsg(`Restored ${data.estimates.length} estimates and settings.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <Card title="Backup & restore">
      <p className="muted">Everything is saved in this browser. Download a backup to move it to another computer or keep it safe. (Uploaded report images are not included.)</p>
      {msg && <p className="notice">{msg}</p>}
      <div className="actions">
        <button onClick={() => download(`shingle-estimator-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ settings, estimates }, null, 2), 'application/json')}>
          Download backup
        </button>
        <label className="button secondary">Restore backup<input hidden type="file" accept=".json,application/json" onChange={(e) => onRestore(e.target.files?.[0])} /></label>
        <button
          className="secondary danger"
          onClick={() => { if (confirm('Reset price list, labor, scope options and contract text to the starter defaults? Estimates are kept.')) setSettings(() => defaultSettings()); }}
        >
          Reset settings to defaults
        </button>
      </div>
    </Card>
  );
}
